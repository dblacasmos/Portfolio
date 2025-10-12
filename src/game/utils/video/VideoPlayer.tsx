import React, { useRef } from "react";
import { useEscOrTapToClose } from "@/hooks/useEnterOrTapToClose";

type Props = {
    src: string;
    open: boolean;
    onClose: () => void;
    autoPlay?: boolean;
    controls?: boolean;
};

const VideoPlayer: React.FC<Props> = ({ src, open, onClose, autoPlay = true, controls = true }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    useEscOrTapToClose({
        enabled: open,
        onClose,
        closeOnBackdropOnly: false,
        backdropElement: wrapRef.current ?? null,
    });

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50" ref={wrapRef}>
            <div className="absolute inset-0 bg-black/70" data-backdrop="true" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <video
                    src={src}
                    autoPlay={autoPlay}
                    controls={controls}
                    className="max-w-[90%] max-h-[80%] rounded-xl shadow-2xl"
                />
            </div>
        </div>
    );
};

export default VideoPlayer;
