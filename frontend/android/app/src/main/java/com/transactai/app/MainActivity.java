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
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.plugin.util.PermissionHelper;

/**
 * Registers for {@code SMS_RECEIVED} and forwards text to the WebView via {@code onSmsReceived}.
 * Requires runtime {@code RECEIVE_SMS} + {@code READ_SMS} (Android 6+).
 * For Android 13+, also requires {@code POST_NOTIFICATIONS}.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "TransactAI-SMS";
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";
    private static final int SMS_PERMISSION_REQ = 1001;
    private static final int NOTIFICATION_PERMISSION_REQ = 1002;

    private BroadcastReceiver smsReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerSmsReceiver();
        requestAllPermissionsIfNeeded();
    }

    private void requestAllPermissionsIfNeeded() {
        // Request SMS permissions
        requestSmsPermissionsIfNeeded();
        
        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, 
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, 
                    NOTIFICATION_PERMISSION_REQ);
            }
        }
    }

    private void requestSmsPermissionsIfNeeded() {
        String[] perms;
        
        // For Android 13+, we need different SMS permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_MMS,
                Manifest.permission.RECEIVE_WAP_PUSH
            };
        } else {
            perms = new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            };
        }
        
        boolean need = false;
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                need = true;
                break;
            }
        }
        
        if (need) {
            ActivityCompat.requestPermissions(this, perms, SMS_PERMISSION_REQ);
            
            // Show rationale to user
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                Toast.makeText(this, "TransactAI needs SMS permissions to automatically detect bank transactions", Toast.LENGTH_LONG).show();
            }, 1000);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == SMS_PERMISSION_REQ) {
            boolean allGranted = grantResults.length > 0;
            for (int r : grantResults) {
                if (r != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (!allGranted) {
                Log.w(TAG, "SMS permission denied — enable SMS in Android Settings → Apps → TransactAI → Permissions.");
                Toast.makeText(this, "SMS permissions denied. Real-time transaction detection may not work.", Toast.LENGTH_LONG).show();
            } else {
                Log.i(TAG, "SMS permissions granted successfully");
                Toast.makeText(this, "SMS permissions granted! Real-time transaction detection is now active.", Toast.LENGTH_SHORT).show();
            }
        }
        
        if (requestCode == NOTIFICATION_PERMISSION_REQ) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Notification permission granted");
            } else {
                Log.w(TAG, "Notification permission denied");
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

                    // Log for debugging
                    Log.i(TAG, "SMS received from: " + sender + ", message: " + messageBody.substring(0, Math.min(50, messageBody.length())) + "...");

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
            Log.i(TAG, "SMS receiver registered successfully");
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
                    Log.d(TAG, "SMS forwarded to WebView successfully");
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
                Log.i(TAG, "SMS receiver unregistered");
            } catch (Exception ignored) {
            }
            smsReceiver = null;
        }
        super.onDestroy();
    }
}
