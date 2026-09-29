package com.zapdrop.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "ZapdropNative",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "storage"),
        @Permission(strings = {
            "android.permission.READ_MEDIA_IMAGES",
            "android.permission.READ_MEDIA_VIDEO",
            "android.permission.READ_MEDIA_AUDIO"
        }, alias = "media")
    }
)
public class ZapdropNativePlugin extends Plugin {

    private ZapdropServer server;
    private WifiManager.MulticastLock multicastLock;
    private boolean isDiscovering = false;
    private Thread broadcastThread;
    private Thread listenThread;
    private DatagramSocket listenSocket;
    private final Map<String, Long> seenDevices = new ConcurrentHashMap<>();

    private String permAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "media" : "storage";
    }

    private boolean hasStorageAccess() {
        return getPermissionState(permAlias()) == PermissionState.GRANTED
            || Build.VERSION.SDK_INT < 23;
    }

    // ---------- listMedia ----------
    @PluginMethod
    public void listMedia(PluginCall call) {
        if (!hasStorageAccess()) {
            requestPermissionForAlias(permAlias(), call, "mediaPermCallback");
            return;
        }
        doListMedia(call);
    }

    @PermissionCallback
    private void mediaPermCallback(PluginCall call) {
        if (hasStorageAccess()) {
            doListMedia(call);
        } else {
            call.reject("Storage permission denied");
        }
    }

    private void doListMedia(PluginCall call) {
        String type = call.getString("type", "all");
        String bucket = call.getString("bucket");
        String query = call.getString("query");
        int limit = call.getInt("limit", 60);
        int offset = call.getInt("offset", 0);

        Uri collection = MediaStore.Files.getContentUri("external");
        String[] proj = {
            MediaStore.Files.FileColumns._ID,
            MediaStore.Files.FileColumns.DISPLAY_NAME,
            MediaStore.Files.FileColumns.SIZE,
            MediaStore.Files.FileColumns.MIME_TYPE,
            MediaStore.Files.FileColumns.DATE_MODIFIED,
            MediaStore.Files.FileColumns.MEDIA_TYPE,
            MediaStore.Files.FileColumns.DATA
        };

        List<String> where = new ArrayList<>();
        List<String> args = new ArrayList<>();
        where.add(MediaStore.Files.FileColumns.SIZE + " > 0");

        if ("image".equalsIgnoreCase(type)) {
            where.add(MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE);
        } else if ("video".equalsIgnoreCase(type)) {
            where.add(MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO);
        } else if ("audio".equalsIgnoreCase(type)) {
            where.add(MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO);
        } else if ("doc".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/pdf'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'text/%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%word%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%sheet%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%presentation%')");
        } else if ("app".equalsIgnoreCase(type)) {
            where.add(MediaStore.Files.FileColumns.MIME_TYPE + "='application/vnd.android.package-archive'");
        }

        if (bucket != null && !bucket.isEmpty()) {
            where.add(MediaStore.Files.FileColumns.DATA + " LIKE ?");
            args.add("%/" + bucket + "/%");
        }
        if (query != null && !query.isEmpty()) {
            where.add(MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE ?");
            args.add("%" + query + "%");
        }

        StringBuilder selectionBuilder = new StringBuilder();
        for (int i = 0; i < where.size(); i++) {
            if (i > 0) selectionBuilder.append(" AND ");
            selectionBuilder.append(where.get(i));
        }
        String selection = selectionBuilder.toString();
        String sort = MediaStore.Files.FileColumns.DATE_MODIFIED + " DESC LIMIT " + limit + " OFFSET " + offset;

        JSArray items = new JSArray();
        Context ctx = getContext();
        try (Cursor c = ctx.getContentResolver().query(
                collection, proj, selection, args.toArray(new String[0]), sort)) {
            if (c != null) {
                while (c.moveToNext()) {
                    long id = c.getLong(0);
                    int mt = c.getInt(5);
                    Uri uri;
                    if (mt == MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE) {
                        uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
                    } else if (mt == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO) {
                        uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id);
                    } else if (mt == MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO) {
                        uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                    } else {
                        uri = ContentUris.withAppendedId(collection, id);
                    }

                    String path = c.getString(6);
                    JSObject o = new JSObject();
                    o.put("id", String.valueOf(id));
                    o.put("uri", uri.toString());
                    o.put("webPath", path != null ? "file://" + path : uri.toString());
                    o.put("name", c.getString(1));
                    o.put("size", c.getLong(2));
                    o.put("mime", c.getString(3));
                    o.put("modified", c.getLong(4) * 1000L);
                    o.put("bucket", bucketOf(path));
                    o.put("type", mt == 1 ? "image" : mt == 3 ? "video" : mt == 2 ? "audio" : "doc");
                    items.put(o);
                }
            }
        } catch (Exception e) {
            call.reject("Error querying media: " + e.getMessage());
            return;
        }

        JSObject res = new JSObject();
        res.put("items", items);
        res.put("total", items.length());
        call.resolve(res);
    }

    private String bucketOf(String path) {
        if (path == null) return "";
        int e = path.lastIndexOf('/');
        if (e <= 0) return "";
        int s = path.lastIndexOf('/', e - 1);
        return path.substring(s + 1, e);
    }

    // ---------- listBuckets ----------
    @PluginMethod
    public void listBuckets(PluginCall call) {
        if (!hasStorageAccess()) {
            call.reject("Storage permission denied");
            return;
        }
        Uri collection = MediaStore.Files.getContentUri("external");
        String[] proj = { MediaStore.Files.FileColumns.DATA };
        Map<String, Integer> counts = new LinkedHashMap<>();
        Map<String, String> paths = new HashMap<>();

        try (Cursor c = getContext().getContentResolver().query(
                collection, proj, MediaStore.Files.FileColumns.SIZE + ">0", null, null)) {
            while (c != null && c.moveToNext()) {
                String p = c.getString(0);
                if (p == null) continue;
                String b = bucketOf(p);
                if (b.isEmpty()) continue;
                Integer current = counts.get(b);
                counts.put(b, current == null ? 1 : current + 1);
                paths.put(b, p.substring(0, p.lastIndexOf('/')));
            }
        } catch (Exception e) {
            call.reject("Error querying buckets: " + e.getMessage());
            return;
        }

        List<Map.Entry<String, Integer>> sorted = new ArrayList<>(counts.entrySet());
        Collections.sort(sorted, (a, b) -> b.getValue() - a.getValue());

        JSArray arr = new JSArray();
        for (int i = 0; i < Math.min(sorted.size(), 30); i++) {
            JSObject o = new JSObject();
            o.put("name", sorted.get(i).getKey());
            o.put("count", sorted.get(i).getValue());
            o.put("path", paths.get(sorted.get(i).getKey()));
            arr.put(o);
        }
        JSObject res = new JSObject();
        res.put("buckets", arr);
        call.resolve(res);
    }

    // ---------- getLocalIp ----------
    @PluginMethod
    public void getLocalIp(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ip", findLocalIp());
        call.resolve(r);
    }

    static String findLocalIp() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && !a.isLoopbackAddress() && a.isSiteLocalAddress()) {
                        return a.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ---------- server ----------
    @PluginMethod
    public void startServer(PluginCall call) {
        try {
            stopServerInternal();
            String token = call.getString("token");
            JSArray files = call.getArray("files");
            server = new ZapdropServer(getContext(), 0, token, files, new ZapdropServer.Events() {
                @Override
                public void onProgress(String id, long bytes, long total) {
                    JSObject o = new JSObject();
                    o.put("id", id);
                    o.put("bytes", bytes);
                    o.put("total", total);
                    notifyListeners("fileServed", o);
                }
                @Override
                public void onDone(String peerIp) {
                    JSObject o = new JSObject();
                    o.put("peerIp", peerIp);
                    notifyListeners("transferDone", o);
                }
            });
            server.start();
            JSObject r = new JSObject();
            r.put("ip", findLocalIp());
            r.put("port", server.getListeningPort());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Cannot start server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        stopServerInternal();
        call.resolve();
    }

    private void stopServerInternal() {
        if (server != null) {
            server.stop();
            server = null;
        }
    }

    // ---------- UDP Discovery (Nearby Radar) ----------
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        final String deviceId = call.getString("deviceId", "device-" + System.currentTimeMillis());
        final String name = call.getString("name", "Zapdrop Device");
        stopDiscoveryInternal();

        try {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                multicastLock = wifi.createMulticastLock("zapdrop_radar");
                multicastLock.setReferenceCounted(true);
                multicastLock.acquire();
            }

            isDiscovering = true;
            listenSocket = new DatagramSocket(48555);
            listenSocket.setBroadcast(true);
            listenSocket.setReuseAddress(true);

            // Broadcast thread
            broadcastThread = new Thread(() -> {
                while (isDiscovering) {
                    try {
                        String localIp = findLocalIp();
                        if (localIp != null) {
                            String msg = "ZAPDROP|" + deviceId + "|" + name + "|48555";
                            byte[] data = msg.getBytes();
                            DatagramPacket p = new DatagramPacket(
                                data, data.length, InetAddress.getByName("255.255.255.255"), 48555
                            );
                            listenSocket.send(p);
                        }
                        Thread.sleep(2000);
                    } catch (Exception ignored) {}
                }
            });
            broadcastThread.start();

            // Listener thread
            listenThread = new Thread(() -> {
                byte[] buf = new byte[1024];
                while (isDiscovering) {
                    try {
                        DatagramPacket p = new DatagramPacket(buf, buf.length);
                        listenSocket.receive(p);
                        String str = new String(p.getData(), 0, p.getLength());
                        if (str.startsWith("ZAPDROP|")) {
                            String[] parts = str.split("\\|");
                            if (parts.length >= 4) {
                                String senderId = parts[1];
                                String senderName = parts[2];
                                int port = Integer.parseInt(parts[3]);
                                String senderIp = p.getAddress().getHostAddress();

                                if (!senderId.equals(deviceId)) {
                                    boolean isNew = !seenDevices.containsKey(senderId);
                                    seenDevices.put(senderId, System.currentTimeMillis());
                                    if (isNew) {
                                        JSObject o = new JSObject();
                                        o.put("id", senderId);
                                        o.put("name", senderName);
                                        o.put("ip", senderIp);
                                        o.put("port", port);
                                        notifyListeners("deviceFound", o);
                                    }
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            });
            listenThread.start();

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start discovery: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        call.resolve();
    }

    private void stopDiscoveryInternal() {
        isDiscovering = false;
        if (listenSocket != null) {
            try { listenSocket.close(); } catch (Exception ignored) {}
            listenSocket = null;
        }
        if (multicastLock != null && multicastLock.isHeld()) {
            try { multicastLock.release(); } catch (Exception ignored) {}
            multicastLock = null;
        }
        seenDevices.clear();
    }

    @Override
    protected void handleOnDestroy() {
        stopServerInternal();
        stopDiscoveryInternal();
    }
}
