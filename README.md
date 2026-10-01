# Zapdrop

## Android LAN transfer protocol (2.0.9)

- Release starts one awaited `LocalOnlyHotspot` request when no usable local interface exists. The embedded server is started only after Android reports a real IPv4 interface; no fallback gateway is advertised.
- Connect discovery packets carry a protocol version and `release` role. Connect-only devices are not displayed as senders.
- Capacitor Android downloads each manifest file through the same authenticated HTTP endpoint as desktop and emits real progress events.
- Android 10+ restricts apps from silently toggling the user's regular tethering hotspot. Zapdrop uses the supported Local-Only Hotspot API; if the device rejects that request, the app directs the user to system hotspot settings.
