export function OracleStatus({ status }: { status: any }) {
 if (!status) return null;

 return (
 <div className="p-4 bg-muted">
 <div className="font-semibold">Oracle Status</div>
 <div className="text-sm">{JSON.stringify(status)}</div>
 </div>
 );
}
