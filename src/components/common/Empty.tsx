interface EmptyProps {
  message?: string;
  icon?: string;
}

export function Empty({
  message = '暂无数据',
  icon = '📭',
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <span className="text-4xl mb-3">{icon}</span>
      <span className="text-mc-muted text-sm">{message}</span>
    </div>
  );
}

export default Empty;
