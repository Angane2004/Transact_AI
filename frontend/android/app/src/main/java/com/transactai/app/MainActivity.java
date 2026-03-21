package com.transactai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.telephony.SmsMessage;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        IntentFilter filter = new IntentFilter(SMS_RECEIVED);
        registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getAction().equals(SMS_RECEIVED)) {
                    Bundle bundle = intent.getExtras();
                    if (bundle != null) {
                        Object[] pdus = (Object[]) bundle.get("pdus");
                        if (pdus != null) {
                            for (Object pdu : pdus) {
                                SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                                String messageBody = smsMessage.getMessageBody();
                                String sender = smsMessage.getOriginatingAddress();

                                JSObject ret = new JSObject();
                                ret.put("message", messageBody);
                                ret.put("sender", sender);
                                
                                // Notify the Web layer via a global window event
                                bridge.triggerWindowJSEvent("onSmsReceived", ret.toString());
                            }
                        }
                    }
                }
            }
        }, filter);
    }
}
