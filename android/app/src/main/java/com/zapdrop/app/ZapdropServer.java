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
        this.token = token;
        this.deviceName = deviceName != null ? deviceName : "Zapdrop Android";
        this.deviceId = deviceId != null ? deviceId : "android-" + System.currentTimeMillis();
        this.events = ev;
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject f = arr.getJSONObject(i);
                files.put(f.getString("id"), f);
                manifest.put(f);
            }
        }
    }

    @Override
    public Response serve(IHTTPSession s) {
        if (s.getMethod() == Method.OPTIONS) {
            Response r = newFixedLengthResponse(Response.Status.OK, "text/plain", "ok");
            addCorsHeaders(r);
            return r;
        }

        String uri = s.getUri();

        // Status endpoints for active network probing (desktop -> mobile hotspot)
        if (uri.equals("/status") || uri.equals("/api/status")) {
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

        String t = s.getParms().get("t");
        if (t == null || !t.equals(token)) {
            Response r = text(Response.Status.FORBIDDEN, "forbidden");
            addCorsHeaders(r);
            return r;
        }

        if (uri.equals("/manifest") || uri.equals("/api/manifest")) {
            Response r = newFixedLengthResponse(Response.Status.OK, "application/json", manifest.toString());
            addCorsHeaders(r);
            return r;
        }

        if (uri.equals("/done")) {
            events.onDone(s.getHeaders().get("remote-addr"));
            Response r = text(Response.Status.OK, "ok");
            addCorsHeaders(r);
            return r;
        }

        if (uri.startsWith("/file/")) {
            String id = uri.substring(6);
            JSONObject f = files.get(id);
            if (f == null) {
                Response r = text(Response.Status.NOT_FOUND, "not found");
                addCorsHeaders(r);
                return r;
            }
            try {
                Uri u = Uri.parse(f.getString("uri"));
                ParcelFileDescriptor pfd = ctx.getContentResolver().openFileDescriptor(u, "r");
                if (pfd == null) {
                    Response r = text(Response.Status.NOT_FOUND, "file descriptor unavailable");
                    addCorsHeaders(r);
                    return r;
                }
                long total = pfd.getStatSize();
                FileInputStream in = new FileInputStream(pfd.getFileDescriptor());

                long start = 0;
                String range = s.getHeaders().get("range");
                if (range != null && range.startsWith("bytes=")) {
                    start = Long.parseLong(range.substring(6).split("-")[0]);
                    in.getChannel().position(start);
                }
                final long from = start;
                InputStream counting = new FilterInputStream(in) {
                    long sent = from;
                    @Override
                    public int read(byte[] b, int o, int l) throws IOException {
                        int n = super.read(b, o, l);
                        if (n > 0) {
                            sent += n;
                            events.onProgress(id, sent, total);
                        }
                        return n;
                    }
                    @Override
                    public void close() throws IOException {
                        super.close();
                        pfd.close();
                    }
                };

                Response r = newFixedLengthResponse(
                    start > 0 ? Response.Status.PARTIAL_CONTENT : Response.Status.OK,
                    f.getString("mime"),
                    counting,
                    total - start
                );
                r.addHeader("Accept-Ranges", "bytes");
                r.addHeader("Content-Disposition", "attachment; filename=\"" + f.getString("name") + "\"");
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
    }

    private Response text(Response.IStatus st, String m) {
        return newFixedLengthResponse(st, "text/plain", m);
    }
}
