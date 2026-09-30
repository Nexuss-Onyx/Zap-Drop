package com.zapdrop.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;

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
import java.lang.reflect.Method;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "ZapdropNative",
    permissions = {
        @Permission(strings = {
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
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
    private WifiManager.LocalOnlyHotspotReservation hotspotReservation;
    private BroadcastReceiver hotspotReceiver;

    // Cache last server params so server auto-restarts/rebinds when Hotspot becomes ENABLED
    private String lastToken;
    private String lastDeviceName;
    private String lastDeviceId;
    private JSArray lastFiles;

    @Override
    public void load() {
        super.load();
        registerHotspotReceiver();
    }

    private String permAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "media" : "storage";
    }

    private boolean hasStorageAccess() {
        if (Build.VERSION.SDK_INT < 23) return true;
        if (Build.VERSION.SDK_INT >= 30) {
            if (Environment.isExternalStorageManager()) return true;
        }
        if (Build.VERSION.SDK_INT >= 33) {
            return getPermissionState("media") == PermissionState.GRANTED
                || getPermissionState("storage") == PermissionState.GRANTED;
        }
        return getPermissionState("storage") == PermissionState.GRANTED;
    }

    // ---------- Hotspot Management & State Monitoring ----------
    private void registerHotspotReceiver() {
        try {
            if (hotspotReceiver != null) return;
            hotspotReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if ("android.net.wifi.WIFI_AP_STATE_CHANGED".equals(action)) {
                        int state = intent.getIntExtra("wifi_state", 0);
                        // 13 = WIFI_AP_STATE_ENABLED, 11 = WIFI_AP_STATE_DISABLED
                        boolean enabled = (state == 13 || isHotspotEnabled());
                        
                        JSObject o = new JSObject();
                        o.put("enabled", enabled);
                        String currentIp = findLocalIp();
                        o.put("ip", currentIp != null ? currentIp : "192.168.43.1");
                        notifyListeners("hotspotStateChange", o);

                        if (state == 13) {
                            // Hotspot explicitly enabled: ensure server is running if requested
                            if (lastToken != null && server == null) {
                                startServerInternal(lastToken, lastDeviceName, lastDeviceId, lastFiles);
                            }
                        } else if (state == 11) {
                            // Only stop server when hotspot is explicitly DISABLED (11)
                            stopServerInternal();
                        }
                    }
                }
            };
            IntentFilter filter = new IntentFilter("android.net.wifi.WIFI_AP_STATE_CHANGED");
            filter.addAction("android.net.conn.TETHER_STATE_CHANGED");
            getContext().registerReceiver(hotspotReceiver, filter);
        } catch (Exception ignored) {}
    }

    private boolean isHotspotEnabled() {
        try {
            WifiManager wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null) {
                Method method = wifiManager.getClass().getDeclaredMethod("isWifiApEnabled");
                method.setAccessible(true);
                return (Boolean) method.invoke(wifiManager);
            }
        } catch (Exception ignored) {}
        return false;
    }

    private void disableWifiIfEnabled() {
        try {
            WifiManager wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null && wifiManager.isWifiEnabled()) {
                wifiManager.setWifiEnabled(false);
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void getHotspotStatus(PluginCall call) {
        boolean enabled = isHotspotEnabled() || hotspotReservation != null;
        String ip = findLocalIp();
        JSObject r = new JSObject();
        r.put("enabled", enabled);
        r.put("ip", ip != null ? ip : "192.168.43.1");
        r.put("ssid", "Zapdrop Mobile Hotspot");
        call.resolve(r);
    }

    @PluginMethod
    public void toggleHotspot(PluginCall call) {
        boolean enable = call.getBoolean("enable", true);

        if (enable) {
            disableWifiIfEnabled();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    WifiManager wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                    if (wifiManager != null) {
                        wifiManager.startLocalOnlyHotspot(new WifiManager.LocalOnlyHotspotCallback() {
                            @Override
                            public void onStarted(WifiManager.LocalOnlyHotspotReservation reservation) {
                                super.onStarted(reservation);
                                hotspotReservation = reservation;
                                String ip = findLocalIp();
                                JSObject r = new JSObject();
                                r.put("enabled", true);
                                r.put("ip", ip != null ? ip : "192.168.43.1");
                                notifyListeners("hotspotStateChange", r);
                                call.resolve(r);
                            }

                            @Override
                            public void onStopped() {
                                super.onStopped();
                                hotspotReservation = null;
                                JSObject r = new JSObject();
                                r.put("enabled", false);
                                notifyListeners("hotspotStateChange", r);
                            }

                            @Override
                            public void onFailed(int reason) {
                                super.onFailed(reason);
                                openHotspotSettings();
                                JSObject r = new JSObject();
                                r.put("enabled", isHotspotEnabled());
                                call.resolve(r);
                            }
                        }, null);
                        return;
                    }
                } catch (Exception e) {
                    openHotspotSettings();
                }
            } else {
                openHotspotSettings();
            }
            JSObject r = new JSObject();
            r.put("enabled", isHotspotEnabled());
            call.resolve(r);
        } else {
            if (hotspotReservation != null) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        hotspotReservation.close();
                    }
                } catch (Exception ignored) {}
                hotspotReservation = null;
            }
            stopServerInternal();
            JSObject r = new JSObject();
            r.put("enabled", false);
            notifyListeners("hotspotStateChange", r);
            call.resolve(r);
        }
    }

    private void openHotspotSettings() {
        try {
            Intent intent = new Intent();
            intent.setClassName("com.android.settings", "com.android.settings.TetherSettings");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                Intent intent = new Intent(Settings.ACTION_WIRELESS_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ignored) {}
        }
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
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.webm'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mov')");
        } else if ("audio".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'audio/%'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.mp3'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.flac'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.wav'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.m4a'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.aac')");
        } else if ("doc".equalsIgnoreCase(type)) {
            where.add("(" + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/pdf%'"
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%officedocument%'"
                + " OR " + MediaStore.Files.FileColumns.MIME_TYPE + " LIKE '%msword%'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.pdf'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.doc'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.docx'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.txt'"
                + " OR " + MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE '%.apk')");
        }

        if (bucket != null && !bucket.isEmpty()) {
            where.add(MediaStore.Files.FileColumns.DATA + " LIKE ?");
            args.add("%/" + bucket + "/%");
        }

        if (query != null && !query.trim().isEmpty()) {
            where.add(MediaStore.Files.FileColumns.DISPLAY_NAME + " LIKE ?");
            args.add("%" + query.trim() + "%");
        }

        StringBuilder selectionStr = new StringBuilder();
        for (int i = 0; i < where.size(); i++) {
            if (i > 0) selectionStr.append(" AND ");
            selectionStr.append(where.get(i));
        }

        JSArray items = new JSArray();
        int totalCount = 0;

        try (Cursor cursor = getContext().getContentResolver().query(
            collection,
            proj,
            selectionStr.toString(),
            args.toArray(new String[0]),
            MediaStore.Files.FileColumns.DATE_MODIFIED + " DESC"
        )) {
            if (cursor != null) {
                totalCount = cursor.getCount();
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID);
                int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME);
                int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE);
                int mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE);
                int dateCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_MODIFIED);
                int dataCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA);

                if (cursor.moveToPosition(offset)) {
                    int count = 0;
                    do {
                        long id = cursor.getLong(idCol);
                        String name = cursor.getString(nameCol);
                        if (name == null) name = "unnamed";
                        long size = cursor.getLong(sizeCol);
                        String mime = cursor.getString(mimeCol);
                        if (mime == null) mime = "application/octet-stream";
                        long date = cursor.getLong(dateCol) * 1000L;
                        String path = cursor.getString(dataCol);

                        Uri contentUri = ContentUris.withAppendedId(collection, id);

                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("name", name);
                        item.put("size", size);
                        item.put("mime", mime);
                        item.put("modified", date);
                        item.put("uri", contentUri.toString());
                        item.put("path", path);

                        String kind = "other";
                        if (mime.startsWith("image/")) kind = "image";
                        else if (mime.startsWith("video/")) kind = "video";
                        else if (mime.startsWith("audio/")) kind = "audio";
                        else if (mime.contains("pdf") || mime.contains("office") || mime.contains("document") || mime.contains("text")) kind = "doc";
                        item.put("kind", kind);

                        String folderName = "Storage";
                        if (path != null) {
                            File parent = new File(path).getParentFile();
                            if (parent != null) folderName = parent.getName();
                        }
                        item.put("folder", folderName);

                        items.put(item);
                        count++;
                    } while (cursor.moveToNext() && count < limit);
                }
            }
        } catch (Exception e) {
            call.reject("Error querying MediaStore: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("items", items);
        result.put("total", totalCount);
        call.resolve(result);
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

        JSArray arr = new JSArray();
        java.util.Set<String> set = new java.util.HashSet<>();

        try (Cursor c = getContext().getContentResolver().query(collection, proj, MediaStore.Files.FileColumns.SIZE + " > 0", null, null)) {
            if (c != null) {
                int col = c.getColumnIndex(MediaStore.Files.FileColumns.DATA);
                while (c.moveToNext()) {
                    String p = c.getString(col);
                    if (p != null) {
                        File pf = new File(p).getParentFile();
                        if (pf != null && pf.getName() != null && !pf.getName().isEmpty()) {
                            set.add(pf.getName());
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        for (String b : set) {
            JSObject o = new JSObject();
            o.put("name", b);
            o.put("path", b);
            arr.put(o);
        }

        JSObject res = new JSObject();
        res.put("buckets", arr);
        call.resolve(res);
    }

    // ---------- listDirectory (File Explorer) ----------
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
        if (path == null || path.isEmpty() || "root".equalsIgnoreCase(path)) {
            dir = Environment.getExternalStorageDirectory();
        } else {
            dir = new File(path);
        }

        if (!dir.exists()) {
            call.reject("Directory does not exist: " + (path != null ? path : "root"));
            return;
        }

        JSArray items = new JSArray();
        File[] files = dir.listFiles();
        String currentPath = dir.getAbsolutePath();

        if (files != null && files.length > 0) {
            for (File f : files) {
                if (f.isHidden()) continue;
                JSObject o = new JSObject();
                o.put("name", f.getName());
                o.put("path", f.getAbsolutePath());
                o.put("isDirectory", f.isDirectory());
                o.put("size", f.isDirectory() ? 0 : f.length());
                o.put("modified", f.lastModified());

                if (f.isDirectory()) {
                    File[] sub = f.listFiles();
                    int count = 0;
                    if (sub != null) {
                        for (File sf : sub) {
                            if (!sf.isHidden()) count++;
                        }
                    }
                    o.put("itemCount", count);
                }

                String name = f.getName();
                String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";
                o.put("extension", ext);
                items.put(o);
            }
        }

        // Fallback: If File.listFiles() returns null or 0 items due to Scoped Storage, query MediaStore!
        if (items.length() == 0) {
            queryDirectoryViaMediaStore(dir, items);
        }

        JSObject res = new JSObject();
        res.put("path", currentPath);
        res.put("items", items);
        call.resolve(res);
    }

    private void queryDirectoryViaMediaStore(File dir, JSArray items) {
        try {
            Uri collection = MediaStore.Files.getContentUri("external");
            String dirPath = dir.getAbsolutePath();
            if (!dirPath.endsWith("/")) {
                dirPath = dirPath + "/";
            }

            String[] proj = {
                MediaStore.Files.FileColumns._ID,
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.SIZE,
                MediaStore.Files.FileColumns.DATE_MODIFIED,
                MediaStore.Files.FileColumns.DATA
            };

            String selection = MediaStore.Files.FileColumns.DATA + " LIKE ?";
            String[] selectionArgs = new String[]{ dirPath + "%" };

            java.util.Set<String> subDirsAdded = new java.util.HashSet<>();

            try (Cursor cursor = getContext().getContentResolver().query(
                collection,
                proj,
                selection,
                selectionArgs,
                MediaStore.Files.FileColumns.DISPLAY_NAME + " ASC"
            )) {
                if (cursor != null) {
                    int nameCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.DISPLAY_NAME);
                    int sizeCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.SIZE);
                    int dateCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED);
                    int dataCol = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATA);

                    while (cursor.moveToNext()) {
                        String fullPath = cursor.getString(dataCol);
                        if (fullPath == null || !fullPath.startsWith(dirPath)) continue;

                        String relative = fullPath.substring(dirPath.length());
                        if (relative.isEmpty()) continue;

                        int slashIdx = relative.indexOf('/');
                        if (slashIdx != -1) {
                            String subDirName = relative.substring(0, slashIdx);
                            if (!subDirsAdded.contains(subDirName)) {
                                subDirsAdded.add(subDirName);
                                File subFile = new File(dirPath + subDirName);
                                JSObject o = new JSObject();
                                o.put("name", subDirName);
                                o.put("path", subFile.getAbsolutePath());
                                o.put("isDirectory", true);
                                o.put("size", 0);
                                o.put("modified", subFile.lastModified() > 0 ? subFile.lastModified() : System.currentTimeMillis());
                                o.put("itemCount", 1);
                                o.put("extension", "");
                                items.put(o);
                            }
                        } else {
                            String name = cursor.getString(nameCol);
                            if (name == null || name.startsWith(".")) continue;

                            long size = cursor.getLong(sizeCol);
                            long date = cursor.getLong(dateCol) * 1000L;

                            JSObject o = new JSObject();
                            o.put("name", name);
                            o.put("path", fullPath);
                            o.put("isDirectory", false);
                            o.put("size", size);
                            o.put("modified", date);
                            String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";
                            o.put("extension", ext);
                            items.put(o);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
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
            lastToken = call.getString("token");
            lastDeviceName = call.getString("deviceName", "Zapdrop Mobile");
            lastDeviceId = call.getString("deviceId", "android-" + System.currentTimeMillis());
            lastFiles = call.getArray("files");

            // Auto disable Wi-Fi if enabled so Hotspot can bind cleanly
            if (!isHotspotEnabled() && hotspotReservation == null) {
                disableWifiIfEnabled();
            }

            startServerInternal(lastToken, lastDeviceName, lastDeviceId, lastFiles);

            JSObject r = new JSObject();
            String ip = findLocalIp();
            r.put("ip", ip != null ? ip : "192.168.43.1");
            r.put("port", server != null ? server.getListeningPort() : 48556);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Cannot start server: " + e.getMessage());
        }
    }

    private void startServerInternal(String token, String deviceName, String deviceId, JSArray files) {
        try {
            stopServerInternal();
            server = new ZapdropServer(getContext(), 48556, token, deviceName, deviceId, files, new ZapdropServer.Events() {
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
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        lastToken = null;
        lastFiles = null;
        stopServerInternal();
        call.resolve();
    }

    private void stopServerInternal() {
        if (server != null) {
            try {
                server.stop();
            } catch (Exception ignored) {}
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
                        String msg = "ZAPDROP|" + deviceId + "|" + name + "|48555";
                        byte[] data = msg.getBytes();

                        // 1. Broadcast to 255.255.255.255
                        try {
                            DatagramPacket p = new DatagramPacket(
                                data, data.length, InetAddress.getByName("255.255.255.255"), 48555
                            );
                            listenSocket.send(p);
                        } catch (Exception ignored) {}

                        // 2. Broadcast to Mobile Hotspot subnets (192.168.43.255 and 192.168.49.255)
                        try {
                            DatagramPacket p43 = new DatagramPacket(
                                data, data.length, InetAddress.getByName("192.168.43.255"), 48555
                            );
                            listenSocket.send(p43);
                        } catch (Exception ignored) {}

                        try {
                            DatagramPacket p49 = new DatagramPacket(
                                data, data.length, InetAddress.getByName("192.168.49.255"), 48555
                            );
                            listenSocket.send(p49);
                        } catch (Exception ignored) {}

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
        if (hotspotReceiver != null) {
            try { getContext().unregisterReceiver(hotspotReceiver); } catch (Exception ignored) {}
            hotspotReceiver = null;
        }
        stopServerInternal();
        stopDiscoveryInternal();
    }
}
