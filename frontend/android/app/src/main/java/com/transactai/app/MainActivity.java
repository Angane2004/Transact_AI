package com.transactai.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

/**
 * Registers for {@code SMS_RECEIVED} and forwards text to the WebView via {@code onSmsReceived}.
 * Requires runtime {@code RECEIVE_SMS} + {@code READ_SMS} (Android 6+).
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "TransactAI-SMS";
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";
    private static final int SMS_PERMISSION_REQ = 1001;

    private BroadcastReceiver smsReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerSmsReceiver();
        requestSmsPermissionsIfNeeded();
    }

    private void requestSmsPermissionsIfNeeded() {
        String[] perms = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
        };
        boolean need = false;
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                need = true;
                break;
            }
        }
        if (need) {
            ActivityCompat.requestPermissions(this, perms, SMS_PERMISSION_REQ);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQ) {
            boolean ok = grantResults.length > 0;
            for (int r : grantResults) {
                if (r != PackageManager.PERMISSION_GRANTED) ok = false;
            }
            if (!ok) {
                Log.w(TAG, "SMS permission denied — enable SMS in Android Settings → Apps → TransactAI → Permissions.");
            }
        }
    }

    private void registerSmsReceiver() {
        if (smsReceiver != null) return;

        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getAction() == null || !SMS_RECEIVED.equals(intent.getAction())) return;
                Bundle bundle = intent.getExtras();
                if (bundle == null) return;

                Object[] pdus = (Object[]) bundle.get("pdus");
                String format = bundle.getString("format");
                if (pdus == null) return;

                for (Object pdu : pdus) {
                    SmsMessage smsMessage;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                    } else {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                    }
                    String messageBody = smsMessage.getMessageBody();
                    String sender = smsMessage.getOriginatingAddress();

                    JSObject ret = new JSObject();
                    ret.put("message", messageBody);
                    ret.put("sender", sender);
                    String payload = ret.toString();

                    dispatchToWeb(payload);
                }
            }
        };

        IntentFilter filter = new IntentFilter(SMS_RECEIVED);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(smsReceiver, filter);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to register SMS receiver", e);
        }
    }

    /**
     * Bridge may not be ready the instant SMS arrives; retry briefly so the WebView never misses the event.
     */
    private void dispatchToWeb(String payload) {
        final int[] attempts = {0};
        final Handler handler = new Handler(Looper.getMainLooper());
        Runnable trySend = new Runnable() {
            @Override
            public void run() {
                if (getBridge() != null) {
                    getBridge().triggerWindowJSEvent("onSmsReceived", payload);
                    return;
                }
                attempts[0]++;
                if (attempts[0] < 40) {
                    handler.postDelayed(this, 100);
                } else {
                    Log.w(TAG, "Bridge not ready; SMS not forwarded to WebView.");
                }
            }
        };
        handler.post(trySend);
    }

    @Override
    public void onDestroy() {
        if (smsReceiver != null) {
            try {
                unregisterReceiver(smsReceiver);
            } catch (Exception ignored) {
            }
            smsReceiver = null;
        }
        super.onDestroy();
    }
}
