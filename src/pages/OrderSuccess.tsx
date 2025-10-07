import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface StatusResult {
  success: boolean;
  status?: string; // COMPLETED | FAILED | REVERSED | PENDING
  paymentStatus?: string; // completed | failed | refunded | pending
  orderId?: string | null;
  error?: string;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function OrderSuccess() {
  const qs = useQuery();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<StatusResult | null>(null);

  const orderTrackingId = qs.get("OrderTrackingId") || qs.get("orderTrackingId") || "";
  const merchantRef = qs.get("OrderMerchantReference") || ""; // often ORDER-<orderId>
  const parsedOrderId = merchantRef.startsWith("ORDER-") ? merchantRef.substring(6) : null;

  useEffect(() => {
    // SEO: title + description + canonical
    document.title = "Order Success | Payment Status";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute("content", "View your Pesapal payment status and order confirmation.");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "View your Pesapal payment status and order confirmation.";
      document.head.appendChild(m);
    }
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      if (!orderTrackingId && !parsedOrderId) {
        setResult({ success: false, error: "Missing OrderTrackingId or Order ID" });
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("check-pesapal-status", {
          body: {
            orderTrackingId: orderTrackingId || undefined,
            orderId: parsedOrderId || undefined,
          },
        });
        if (error) throw error;
        setResult(data as StatusResult);
      } catch (e: any) {
        setResult({ success: false, error: e?.message || "Failed to check payment status" });
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTrackingId, parsedOrderId]);

  const statusBadge = (paymentStatus?: string) => {
    const map: Record<string, string> = {
      completed: "text-green-600",
      failed: "text-red-600",
      refunded: "text-yellow-600",
      pending: "text-muted-foreground",
    };
    const cls = paymentStatus ? map[paymentStatus] || "text-muted-foreground" : "text-muted-foreground";
    return <span className={`text-sm font-medium ${cls}`}>{paymentStatus || "unknown"}</span>;
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Order Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Checking payment status…</p>
          )}

          {!loading && result && (
            <div className="space-y-2">
              <p className="text-sm">Tracking ID: <span className="font-mono">{orderTrackingId || "-"}</span></p>
              {parsedOrderId && (
                <p className="text-sm">Order ID: <span className="font-mono">{parsedOrderId}</span></p>
              )}
              {result.error ? (
                <p className="text-sm text-destructive">{result.error}</p>
              ) : (
                <>
                  <p className="text-sm">Gateway status: <span className="font-medium">{result.status}</span></p>
                  <p className="text-sm flex items-center gap-2">
                    Payment status: {statusBadge(result.paymentStatus)}
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="default">
            <Link to="/">Back to Home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/admin/orders">View Orders</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
