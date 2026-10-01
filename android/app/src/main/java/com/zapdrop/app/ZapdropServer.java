package com.zapdrop.app;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import com.getcapacitor.JSArray;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

public class ZapdropServer extends NanoHTTPD {

    public interface Events {
        void onProgress(String id, long bytes, long total);
        void onDone(String peerIp);
    }

    private final Context ctx;
    private final String token;
    private final String deviceName;
    private final String deviceId;
    private final Events events;
    private final Map<String, JSONObject> files = new HashMap<>();
    private final JSONArray manifest = new JSONArray();

    public ZapdropServer(Context ctx, int port, String token, String deviceName, String deviceId, JSArray arr, Events ev) throws Exception {
        super(port);
        this.ctx = ctx;
        this.token = token != null ? token : "";
        this.deviceName = deviceName != null ? deviceName : "Zapdrop Android";
        this.deviceId = deviceId != null ? deviceId : "android-" + System.currentTimeMillis();
        this.events = ev;
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject f = arr.getJSONObject(i);
                if (f.has("id")) {
                    files.put(f.getString("id"), f);
                    manifest.put(f);
                }
            }
        }
    }

    @Override
    public Response serve(IHTTPSession s) {
        // Handle OPTIONS Preflight CORS for Web & Mobile clients
        if (s.getMethod() == Method.OPTIONS) {
            Response r = newFixedLengthResponse(Response.Status.OK, "text/plain", "ok");
            addCorsHeaders(r);
            return r;
        }

        String uri = s.getUri();

        // 1. Handshake / Access request endpoints (/hello, /api/hello, /request, /api/request)
        if (uri.equals("/hello") || uri.equals("/api/hello") || uri.equals("/request") || uri.equals("/api/request")) {
            try {
                JSONObject res = new JSONObject();
                res.put("status", "ok");
                res.put("token", token);
                res.put("deviceName", deviceName);
                res.put("deviceId", deviceId);
                Response r = newFixedLengthResponse(Response.Status.OK, "application/json", res.toString());
                addCorsHeaders(r);
                return r;
            } catch (Exception e) {
                Response r = text(Response.Status.INTERNAL_ERROR, e.getMessage());
                addCorsHeaders(r);
                return r;
            }
        }

        // 2. Status / Healthcheck endpoints (/status, /api/status, /ping, /api/ping)
        if (uri.equals("/status") || uri.equals("/api/status") || uri.equals("/ping") || uri.equals("/api/ping")) {
            try {
                JSONObject res = new JSONObject();
                res.put("status", "ok");
                res.put("name", deviceName);
                res.put("deviceId", deviceId);
                res.put("platform", "android");
                res.put("fileCount", files.size());
                Response r = newFixedLengthResponse(Response.Status.OK, "application/json", res.toString());
                addCorsHeaders(r);
                return r;
            } catch (Exception e) {
                Response r = text(Response.Status.INTERNAL_ERROR, e.getMessage());
                addCorsHeaders(r);
                return r;
            }
        }

        // Extract token from query params ('t' or 'token') or Authorization header
        String requestToken = s.getParms().get("t");
        if (requestToken == null || requestToken.isEmpty()) {
            requestToken = s.getParms().get("token");
        }
        if (requestToken == null || requestToken.isEmpty()) {
            String authHeader = s.getHeaders().get("authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                requestToken = authHeader.substring(7).trim();
            }
        }

        // Validate token if server token is configured
        if (token != null && !token.isEmpty() && !token.equals("null") && !token.equals("no-token")) {
            if (requestToken != null && !requestToken.equals(token) && !uri.equals("/manifest") && !uri.equals("/api/manifest")) {
                Response r = text(Response.Status.FORBIDDEN, "forbidden: invalid token");
                addCorsHeaders(r);
                return r;
            }
        }

        // 3. Manifest endpoints (/manifest, /api/manifest)
        if (uri.equals("/manifest") || uri.equals("/api/manifest")) {
            Response r = newFixedLengthResponse(Response.Status.OK, "application/json", manifest.toString());
            addCorsHeaders(r);
            return r;
        }

        // 4. Transfer Done notification endpoint (/done, /api/done)
        if (uri.equals("/done") || uri.equals("/api/done")) {
            String remoteIp = s.getHeaders().get("remote-addr");
            if (events != null) {
                events.onDone(remoteIp);
            }
            Response r = text(Response.Status.OK, "ok");
            addCorsHeaders(r);
            return r;
        }

        // 5. File Download endpoint (/file/:id, /api/file/:id)
        if (uri.startsWith("/file/") || uri.startsWith("/api/file/")) {
            String id = uri.startsWith("/api/file/") ? uri.substring(10) : uri.substring(6);
            if (id.contains("?")) {
                id = id.substring(0, id.indexOf('?'));
            }
            JSONObject f = files.get(id);
            if (f == null) {
                Response r = text(Response.Status.NOT_FOUND, "file not found");
                addCorsHeaders(r);
                return r;
            }
            try {
                String uriStr = f.has("uri") ? f.getString("uri") : (f.has("path") ? f.getString("path") : "");
                Uri u = Uri.parse(uriStr);
                ParcelFileDescriptor pfd = null;

                if (uriStr.startsWith("content://")) {
                    pfd = ctx.getContentResolver().openFileDescriptor(u, "r");
                } else if (uriStr.startsWith("file://")) {
                    pfd = ParcelFileDescriptor.open(new java.io.File(u.getPath()), ParcelFileDescriptor.MODE_READ_ONLY);
                } else if (!uriStr.isEmpty()) {
                    pfd = ParcelFileDescriptor.open(new java.io.File(uriStr), ParcelFileDescriptor.MODE_READ_ONLY);
                }

                if (pfd == null) {
                    Response r = text(Response.Status.NOT_FOUND, "file descriptor unavailable");
                    addCorsHeaders(r);
                    return r;
                }

                final ParcelFileDescriptor activePfd = pfd;
                long total = activePfd.getStatSize();
                FileInputStream in = new FileInputStream(activePfd.getFileDescriptor());

                long start = 0;
                String range = s.getHeaders().get("range");
                if (range != null && range.startsWith("bytes=")) {
                    try {
                        start = Long.parseLong(range.substring(6).split("-")[0]);
                        in.getChannel().position(start);
                    } catch (Exception ignored) {}
                }
                final long from = start;
                final String fileId = id;

                InputStream counting = new FilterInputStream(in) {
                    long sent = from;
                    @Override
                    public int read(byte[] b, int o, int l) throws IOException {
                        int n = super.read(b, o, l);
                        if (n > 0) {
                            sent += n;
                            if (events != null) {
                                events.onProgress(fileId, sent, total);
                            }
                        }
                        return n;
                    }
                    @Override
                    public void close() throws IOException {
                        super.close();
                        try { activePfd.close(); } catch (Exception ignored) {}
                    }
                };

                String mime = f.has("mime") ? f.getString("mime") : "application/octet-stream";
                String name = f.has("name") ? f.getString("name") : "download";

                Response r = newFixedLengthResponse(
                    start > 0 ? Response.Status.PARTIAL_CONTENT : Response.Status.OK,
                    mime,
                    counting,
                    total - start
                );
                r.addHeader("Accept-Ranges", "bytes");
                r.addHeader("Content-Disposition", "attachment; filename=\"" + name + "\"");
                if (start > 0) {
                    r.addHeader("Content-Range", "bytes " + start + "-" + (total - 1) + "/" + total);
                }
                addCorsHeaders(r);
                return r;
            } catch (Exception e) {
                Response r = text(Response.Status.INTERNAL_ERROR, e.getMessage());
                addCorsHeaders(r);
                return r;
            }
        }

        Response r = text(Response.Status.NOT_FOUND, "not found");
        addCorsHeaders(r);
        return r;
    }

    private void addCorsHeaders(Response r) {
        r.addHeader("Access-Control-Allow-Origin", "*");
        r.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        r.addHeader("Access-Control-Allow-Headers", "*");
        r.addHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Disposition, Accept-Ranges");
    }

    private Response text(Response.IStatus st, String m) {
        return newFixedLengthResponse(st, "text/plain", m);
    }
}
