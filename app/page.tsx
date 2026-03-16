export default function Dashboard() {
  return (
    <div>
      <h1 className="text-[#007782] text-2xl font-bold mb-4">
        Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-black p-4 rounded shadow">
          Total Users: 1200
        </div>

        <div className="text-black p-4 rounded shadow">
          Orders: 320
        </div>

        <div className="text-black p-4 rounded shadow">
          Pending Payouts: 12
        </div>

        <div className="text-black p-4 rounded shadow">
          Disputes: 3
        </div>
      </div>
    </div>
  );
}
