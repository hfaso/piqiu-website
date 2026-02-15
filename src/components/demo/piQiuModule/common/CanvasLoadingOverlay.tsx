import "./CanvasLoadingOverlay.css";

type Props = {
  loading: boolean;
  text?: string;
};

export default function CanvasLoadingOverlay({
  loading,
  text = "模型加载中...",
}: Props) {
  if (!loading) return null;

  return (
    <div className="canvas-loading-overlay" role="status" aria-live="polite">
      <span className="canvas-loading-spinner" aria-hidden="true"></span>
      <span className="canvas-loading-text">{text}</span>
    </div>
  );
}
