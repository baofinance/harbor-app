import PoolClient from"./PoolClient";
import { markets } from"@/config/contracts";

export async function generateStaticParams() {
 const params: Array<{ marketId: string; poolType: string }> = [];
 Object.keys(markets).forEach((marketId) => {
 params.push({ marketId, poolType:"collateral" });
 params.push({ marketId, poolType:"leveraged" });
 });
 return params;
}

interface PoolPageProps {
 params: { marketId: string; poolType:"collateral" |"leveraged" };
}

export default async function PoolPage({ params }: PoolPageProps) {
 const resolvedParams = await params;
 return (
 <PoolClient
 marketId={resolvedParams.marketId}
 poolType={resolvedParams.poolType}
 />
 );
}
