package com.stormfiber.calculator;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Draws the app edge to edge (behind the status bar and the gesture bar) and
 * hands the system bar insets over to the web app, which uses them as CSS
 * custom properties (--safe-area-top, --safe-area-bottom, ...).
 */
public class MainActivity extends BridgeActivity {

    private int safeAreaTop;
    private int safeAreaBottom;
    private int safeAreaLeft;
    private int safeAreaRight;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            safeAreaTop = insets.top;
            safeAreaBottom = insets.bottom;
            safeAreaLeft = insets.left;
            safeAreaRight = insets.right;
            applySafeArea();
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(content);
    }

    private void applySafeArea() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        String js =
            "(function(){" +
            "if(!document.documentElement){return 'pending';}" +
            "var s=document.documentElement.style;" +
            "s.setProperty('--safe-area-top','" + safeAreaTop + "px');" +
            "s.setProperty('--safe-area-bottom','" + safeAreaBottom + "px');" +
            "s.setProperty('--safe-area-left','" + safeAreaLeft + "px');" +
            "s.setProperty('--safe-area-right','" + safeAreaRight + "px');" +
            "return 'applied';" +
            "})();";

        bridge.getWebView().evaluateJavascript(js, value -> {
            // The web view might not have loaded its document yet, retry until it has.
            if (value == null || !value.contains("applied")) {
                View content = findViewById(android.R.id.content);
                if (content != null) {
                    content.postDelayed(this::applySafeArea, 250);
                }
            }
        });
    }
}
