package com.zapdrop.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
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

import java.io.File;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "ZapdropNative",
    permissions = {
        @Permission(strings = {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }, alias = "storage"),
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
        if (Build.VERSION.SDK_INT < 23) return true;
        if (Build.VERSION.SDK_INT >= 33) {
            return getPermissionState("media") == PermissionState.GRANTED
                || getPermissionState("storage") == PermissionState.GRANTED;
        }
        return getPermissionState("storage") == PermissionState.GRANTED;
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
        doListMedia(call);
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
            where.add("(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'image/%'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.jpg'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.jpeg'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.png'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.webp'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.gif')");
        } else if ("video".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'video/%'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mp4'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mkv'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mov'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.3gp')");
        } else if ("audio".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'audio/%'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mp3'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.wav'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.flac'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.m4a'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.aac')");
        } else if ("doc".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/pdf'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'text/%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%word%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%sheet%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%presentation%'"
              + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%document%'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.pdf'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.doc'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.docx'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.xls'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.xlsx'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.ppt'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.pptx'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.txt'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.csv')");
        } else if ("app".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MIME_TYPE + "='application/vnd.android.package-archive'"
              + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.apk')");
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
        // Safe sort order without LIMIT/OFFSET to prevent Android 10+ query rejection
        String sort = MediaStore.Files.FileColumns.DATE_MODIFIED + " DESC";

        JSArray items = new JSArray();
        Context ctx = getContext();
        int total = 0;

        try (Cursor c = ctx.getContentResolver().query(
                collection, proj, selection, args.toArray(new String[0]), sort)) {
            if (c != null) {
                total = c.getCount();
                if (offset > 0 && offset < total) {
                    c.moveToPosition(offset - 1);
                } else if (offset >= total) {
                    JSObject res = new JSObject();
                    res.put("items", items);
                    res.put("total", total);
                    call.resolve(res);
                    return;
                }

                int count = 0;
                int idCol = c.getColumnIndex(MediaStore.Files.FileColumns._ID);
                int nameCol = c.getColumnIndex(MediaStore.Files.FileColumns.DISPLAY_NAME);
                int sizeCol = c.getColumnIndex(MediaStore.Files.FileColumns.SIZE);
                int mimeCol = c.getColumnIndex(MediaStore.Files.FileColumns.MIME_TYPE);
                int dateCol = c.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED);
                int mediaTypeCol = c.getColumnIndex(MediaStore.Files.FileColumns.MEDIA_TYPE);
                int dataCol = c.getColumnIndex(MediaStore.Files.FileColumns.DATA);

                while (c.moveToNext() && count < limit) {
                    long id = idCol != -1 ? c.getLong(idCol) : 0;
                    int mt = mediaTypeCol != -1 ? c.getInt(mediaTypeCol) : 0;
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

                    String path = dataCol != -1 ? c.getString(dataCol) : null;
                    String name = nameCol != -1 ? c.getString(nameCol) : ("file_" + id);
                    long size = sizeCol != -1 ? c.getLong(sizeCol) : 0;
                    String mime = mimeCol != -1 ? c.getString(mimeCol) : "application/octet-stream";
                    long modified = dateCol != -1 ? c.getLong(dateCol) * 1000L : System.currentTimeMillis();

                    String detectedType = "doc";
                    String lowerName = name != null ? name.toLowerCase(Locale.ROOT) : "";
                    if (mt == 1 || (mime != null && mime.startsWith("image/")) || lowerName.endsWith(".jpg") || lowerName.endsWith(".png") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".webp") || lowerName.endsWith(".gif")) {
                        detectedType = "image";
                    } else if (mt == 3 || (mime != null && mime.startsWith("video/")) || lowerName.endsWith(".mp4") || lowerName.endsWith(".mkv") || lowerName.endsWith(".mov") || lowerName.endsWith(".3gp")) {
                        detectedType = "video";
                    } else if (mt == 2 || (mime != null && mime.startsWith("audio/")) || lowerName.endsWith(".mp3") || lowerName.endsWith(".wav") || lowerName.endsWith(".flac") || lowerName.endsWith(".m4a") || lowerName.endsWith(".aac")) {
                        detectedType = "audio";
                    } else if ("application/vnd.android.package-archive".equals(mime) || lowerName.endsWith(".apk")) {
                        detectedType = "app";
                    }

                    JSObject o = new JSObject();
                    o.put("id", String.valueOf(id));
                    o.put("uri", uri.toString());
                    o.put("webPath", (path != null && !path.isEmpty()) ? "file://" + path : uri.toString());
                    o.put("name", name);
                    o.put("size", size);
                    o.put("mime", mime != null ? mime : "application/octet-stream");
                    o.put("modified", modified);
                    o.put("bucket", bucketOf(path));
                    o.put("type", detectedType);
                    items.put(o);
                    count++;
                }
            }
        } catch (Exception e) {
            call.reject("Error querying media: " + e.getMessage());
            return;
        }

        JSObject res = new JSObject();
        res.put("items", items);
        res.put("total", total);
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
            requestPermissionForAlias(permAlias(), call, "bucketsPermCallback");
            return;
        }
        doListBuckets(call);
    }

    @PermissionCallback
    private void bucketsPermCallback(PluginCall call) {
        doListBuckets(call);
    }

    private void doListBuckets(PluginCall call) {
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
        } catch (Exception ignored) {}

        // Also check standard root directories on device if not present
        try {
            File root = Environment.getExternalStorageDirectory();
            if (root != null && root.exists()) {
                String[] standardDirs = {
                    "Download", "DCIM", "Pictures", "Documents", "Movies", "Music"
                };
                for (String std : standardDirs) {
                    File dir = new File(root, std);
                    if (dir.exists() && dir.isDirectory()) {
                        if (!counts.containsKey(std)) {
                            File[] files = dir.listFiles();
                            int fileCount = files != null ? files.length : 0;
                            counts.put(std, fileCount);
                            paths.put(std, dir.getAbsolutePath());
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        List<Map.Entry<String, Integer>> sorted = new ArrayList<>(counts.entrySet());
        Collections.sort(sorted, (a, b) -> b.getValue() - a.getValue());

        JSArray arr = new JSArray();
        for (int i = 0; i < sorted.size(); i++) {
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

    // ---------- listDirectory (Root storage and folder files) ----------
    @PluginMethod
    public void listDirectory(PluginCall call) {
        if (!hasStorageAccess()) {
            requestPermissionForAlias(permAlias(), call, "dirPermCallback");
            return;
        }
        doListDirectory(call);
    }

    @PermissionCallback
    private void dirPermCallback(PluginCall call) {
        doListDirectory(call);
    }

    private void doListDirectory(PluginCall call) {
        String path = call.getString("path");
        File dir;
        if (path == null || path.isEmpty() || "root".equalsIgnoreCase(path) || "/".equals(path)) {
            dir = Environment.getExternalStorageDirectory();
        } else {
            dir = new File(path);
        }

        JSArray items = new JSArray();
        String currentPath = dir != null ? dir.getAbsolutePath() : "";

        if (dir != null && dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null && files.length > 0) {
                Arrays.sort(files, (a, b) -> {
                    if (a.isDirectory() && !b.isDirectory()) return -1;
                    if (!a.isDirectory() && b.isDirectory()) return 1;
                    return a.getName().compareToIgnoreCase(b.getName());
                });

                for (File f : files) {
                    if (f.getName().startsWith(".")) continue;
                    JSObject o = new JSObject();
                    o.put("name", f.getName());
                    o.put("path", f.getAbsolutePath());
                    o.put("isDirectory", f.isDirectory());
                    o.put("size", f.isDirectory() ? 0 : f.length());
                    o.put("modified", f.lastModified());
                    if (f.isDirectory()) {
                        File[] sub = f.listFiles();
                        o.put("itemCount", sub != null ? sub.length : 0);
                    } else {
                        String name = f.getName().toLowerCase(Locale.ROOT);
                        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";
                        o.put("extension", ext);
                    }
                    items.put(o);
                }
            } else if (path == null || path.isEmpty() || "root".equalsIgnoreCase(path) || "/".equals(path)) {
                // Root fallback if direct listFiles is restricted by Scoped Storage on Android 11+
                String[] standardDirs = {
                    Environment.DIRECTORY_DOWNLOADS,
                    Environment.DIRECTORY_DCIM,
                    Environment.DIRECTORY_PICTURES,
                    Environment.DIRECTORY_DOCUMENTS,
                    Environment.DIRECTORY_MOVIES,
                    Environment.DIRECTORY_MUSIC
                };
                Map<String, String> addedNames = new HashMap<>();
                for (String std : standardDirs) {
                    try {
                        File pub = Environment.getExternalStoragePublicDirectory(std);
                        if (pub != null && pub.exists()) {
                            File[] sub = pub.listFiles();
                            JSObject o = new JSObject();
                            o.put("name", pub.getName());
                            o.put("path", pub.getAbsolutePath());
                            o.put("isDirectory", true);
                            o.put("size", 0);
                            o.put("modified", pub.lastModified());
                            o.put("itemCount", sub != null ? sub.length : 0);
                            items.put(o);
                            addedNames.put(pub.getName().toLowerCase(Locale.ROOT), pub.getAbsolutePath());
                        }
                    } catch (Exception ignored) {}
                }

                // Also add any buckets from MediaStore (e.g. Screenshots, Telegram, Pins, etc.)
                try {
                    Uri collection = MediaStore.Files.getContentUri("external");
                    String[] proj = { MediaStore.Files.FileColumns.DATA };
                    try (Cursor c = getContext().getContentResolver().query(
                            collection, proj, MediaStore.Files.FileColumns.SIZE + ">0", null, null)) {
                        while (c != null && c.moveToNext()) {
                            String p = c.getString(0);
                            if (p == null) continue;
                            String b = bucketOf(p);
                            if (b.isEmpty() || addedNames.containsKey(b.toLowerCase(Locale.ROOT))) continue;
                            String folderPath = p.substring(0, p.lastIndexOf('/'));
                            File bFile = new File(folderPath);
                            JSObject o = new JSObject();
                            o.put("name", b);
                            o.put("path", folderPath);
                            o.put("isDirectory", true);
                            o.put("size", 0);
                            o.put("modified", bFile.exists() ? bFile.lastModified() : System.currentTimeMillis());
                            o.put("itemCount", 0);
                            items.put(o);
                            addedNames.put(b.toLowerCase(Locale.ROOT), folderPath);
                        }
                    }
                } catch (Exception ignored) {}
            }

            // If browsing a subfolder and direct listFiles was empty, supplement from MediaStore
            if (path != null && !path.isEmpty() && !"root".equalsIgnoreCase(path) && !"/".equals(path) && items.length() == 0) {
                try {
                    String folderName = dir.getName();
                    Uri collection = MediaStore.Files.getContentUri("external");
                    String[] proj = {
                        MediaStore.Files.FileColumns._ID,
                        MediaStore.Files.FileColumns.DISPLAY_NAME,
                        MediaStore.Files.FileColumns.SIZE,
                        MediaStore.Files.FileColumns.DATE_MODIFIED,
                        MediaStore.Files.FileColumns.DATA
                    };
                    String sel = MediaStore.Files.FileColumns.DATA + " LIKE ?";
                    String[] args = new String[] { "%/" + folderName + "/%" };
                    try (Cursor c = getContext().getContentResolver().query(collection, proj, sel, args, MediaStore.Files.FileColumns.DATE_MODIFIED + " DESC")) {
                        if (c != null) {
                            int nameCol = c.getColumnIndex(MediaStore.Files.FileColumns.DISPLAY_NAME);
                            int sizeCol = c.getColumnIndex(MediaStore.Files.FileColumns.SIZE);
                            int dateCol = c.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED);
                            int dataCol = c.getColumnIndex(MediaStore.Files.FileColumns.DATA);
                            while (c.moveToNext()) {
                                String name = nameCol != -1 ? c.getString(nameCol) : "file";
                                String p = dataCol != -1 ? c.getString(dataCol) : null;
                                long size = sizeCol != -1 ? c.getLong(sizeCol) : 0;
                                long mod = dateCol != -1 ? c.getLong(dateCol) * 1000L : System.currentTimeMillis();
                                String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";

                                JSObject o = new JSObject();
                                o.put("name", name);
                                o.put("path", p != null ? p : (dir.getAbsolutePath() + "/" + name));
                                o.put("isDirectory", false);
                                o.put("size", size);
                                o.put("modified", mod);
                                o.put("extension", ext);
                                items.put(o);
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        JSObject res = new JSObject();
        res.put("path", currentPath);
        res.put("items", items);
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
