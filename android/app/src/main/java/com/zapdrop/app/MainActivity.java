package com.zapdrop.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZapdropNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
