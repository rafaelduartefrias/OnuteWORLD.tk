setInterval(() => {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            const orientation = widthThreshold ? 'vertical' : 'horizontal';
    
            if (
                !(heightThreshold && widthThreshold) &&
                ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)
            ) {
                if (!devtools.isOpen || devtools.orientation !== orientation) {
                    emitEvent(true, orientation);
                }
    
                devtools.isOpen = true;
                devtools.orientation = orientation;
                socket.disconnect();
                window.location.replace("http://uranohoshi.in/warning.html");
            } else {
                if (devtools.isOpen) {
                    emitEvent(false, undefined);
                }
    
                devtools.isOpen = false;
                devtools.orientation = undefined;
            }
        }, 500);
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = devtools;
        } else {
            window.devtools = devtools;
        }
    })();
}