import { forwardRef, useLayoutEffect, useRef } from 'react';
import Backdrop, { type BackdropProps } from '@mui/material/Backdrop';
import { createTitleBarDimmer, type TitleBarDimmer } from '../titlebar-overlay.js';

/** Modal backdrop that also dims the desktop app's native window-controls
 *  overlay, tracking the backdrop's rendered opacity every frame so both
 *  fade in lockstep — including the exit fade and interrupted transitions. */
export const TitleBarAwareBackdrop = forwardRef<HTMLDivElement, BackdropProps>(function TitleBarAwareBackdrop(props, ref) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dimmerRef = useRef<TitleBarDimmer | null>(null);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (props.invisible || !node || !window.kubusDesktop) return;
    const dimmer = (dimmerRef.current ??= createTitleBarDimmer());
    const target = props.open ? 1 : 0;
    let frame = 0;
    const track = () => {
      const opacity = Number(getComputedStyle(node).opacity) || 0;
      dimmer.set(opacity);
      if (node.isConnected && Math.abs(opacity - target) > 0.001) frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [props.open, props.invisible]);

  useLayoutEffect(() => () => dimmerRef.current?.release(), []);

  const setRefs = (node: HTMLDivElement | null) => {
    nodeRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return <Backdrop ref={setRefs} {...props} sx={[{ zIndex: -1 }, ...(Array.isArray(props.sx) ? props.sx : props.sx ? [props.sx] : [])]} />;
});
