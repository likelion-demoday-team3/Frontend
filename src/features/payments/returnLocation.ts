const PAYMENT_RETURN_KEY = "kiiwee-payment-return-location";

type SavedReturnLocation = {
  href: string;
  embeddedStore: boolean;
};

export function savePaymentReturnLocation(embeddedStore: boolean) {
  try {
    sessionStorage.setItem(
      PAYMENT_RETURN_KEY,
      JSON.stringify({ href: window.location.href, embeddedStore }),
    );
  } catch {
    // The checkout can continue without a saved return location.
  }
}

export function getPaymentReturnLocation(status?: string) {
  const fallback = () => ({
    href: status ? `/store?payment=${encodeURIComponent(status)}` : "/store",
    embeddedStore: false,
  });
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(PAYMENT_RETURN_KEY) ?? "null",
    ) as SavedReturnLocation | null;
    if (!saved?.href) return fallback();

    const target = new URL(saved.href, window.location.origin);
    if (
      target.origin !== window.location.origin ||
      /^\/shop\/payment\//.test(target.pathname)
    ) {
      return fallback();
    }

    if (status) target.searchParams.set("payment", status);
    if (saved.embeddedStore) {
      target.searchParams.set("paymentReturn", "embedded");
    }
    return {
      href: `${target.pathname}${target.search}${target.hash}`,
      embeddedStore: saved.embeddedStore,
    };
  } catch {
    return fallback();
  }
}

export function clearPaymentReturnLocation() {
  try {
    sessionStorage.removeItem(PAYMENT_RETURN_KEY);
  } catch {
    // Ignore storage failures; the return flow can still complete.
  }
}
