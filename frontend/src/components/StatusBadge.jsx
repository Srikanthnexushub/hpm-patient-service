export default function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isActive
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-700'
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          isActive ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {status}
    </span>
  )
}
