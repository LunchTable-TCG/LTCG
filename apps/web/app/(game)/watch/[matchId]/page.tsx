export default function WatchPage({ params }: { params: { matchId: string } }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white">
      <h1 className="text-3xl font-black uppercase">Spectating Match {params.matchId}</h1>
    </div>
  );
}
