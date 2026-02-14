export default function ReplayPage({ params }: { params: { matchId: string } }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white">
      <h1 className="text-3xl font-black uppercase">Replay Match {params.matchId}</h1>
    </div>
  );
}
