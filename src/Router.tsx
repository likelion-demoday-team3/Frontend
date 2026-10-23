import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Session from "./pages/Session";
import Result from "./pages/Vote/Result";
import ResultDetail from "./pages/Vote/ResultDetail";
import Contact from "./pages/Contact";
import Store from "./pages/Store/Store";
import ChargeHistory from "./pages/Store/ChargeHistory";
import ChargeInfo from "./pages/Store/ChargeInfo";
import PaymentResult from "./pages/Store/PaymentResult";
import MyPage from "./pages/MyPage/MyPage";
import MeEdit from "./pages/MyPage/MeEdit";
import CardEdit from "./pages/MyPage/CardEdit";
import Record from "./pages/MyPage/Record";
import Reservation from "./pages/MyPage/Reservation";
import ChangePW from "./pages/MyPage/ChangePW";
import ItsMe from "./pages/MyPage/ItsMe";
import RecordList from "./pages/MyPage/RecordList";
import { restoreAccessToken } from "./features/auth/session";

type Route =
  | { page: "home" | "signup" | "login" | "result" | "result-detail" | "contact" | "store" | "charge-history" | "charge-info" | "payment-result" | "mypage" | "mypage-me" | "mypage-card" | "mypage-record" | "mypage-reservation" | "mypage-password" | "mypage-identity" }
  | { page: "mypage-record-list"; section: "matches" | "sent" | "received" }
  | { page: "session"; sessionId: number };

function routeFromPath(pathname: string): Route {
  const route = pathname.replace(/^\//, "");
  if (route === "signup" || route === "login") return { page: route };
  if (route === "result") return { page: "result" };
  if (route === "result-detail") return { page: "result-detail" };
  if (route === "contact") return { page: "contact" };
  if (route === "store") return { page: "store" };
  if (route === "store/history" || route === "charge-history") return { page: "charge-history" };
  if (route === "charge-info") return { page: "charge-info" };
  if (route === "store/payment/result") return { page: "payment-result" };
  if (/^shop\/payment\/[^/]+\/(success|fail)$/.test(route)) return { page: "payment-result" };
  if (route === "mypage") return { page: "mypage" };
  if (route === "mypage/me" || route === "me-edit") return { page: "mypage-me" };
  if (route === "mypage/card" || route === "card-edit") return { page: "mypage-card" };
  if (route === "mypage/record" || route === "record") return { page: "mypage-record" };
  if (route === "mypage/reservation" || route === "reservation") return { page: "mypage-reservation" };
  if (route === "mypage/change-password") return { page: "mypage-password" };
  if (route === "mypage/identity") return { page: "mypage-identity" };
  const recordListRoute = route.match(/^mypage\/record\/(matches|sent|received)$/);
  if (recordListRoute) return { page: "mypage-record-list", section: recordListRoute[1] as "matches" | "sent" | "received" };
  const sessionRoute = route.match(/^session\/(\d+)$/);
  if (sessionRoute) return { page: "session", sessionId: Number(sessionRoute[1]) };
  return { page: "home" };
}

function getRoute() {
  return routeFromPath(window.location.pathname);
}

export default function Router({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, remember?: boolean) => void;
}) {
  const [route, setRoute] = useState(() => {
    restoreAccessToken();
    const current = getRoute();
    if (window.location.pathname === "/")
      window.history.replaceState(null, "", "/home");
    return current;
  });

  useEffect(() => {
    const updateRoute = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="/"]',
      );
      if (link && link.origin === window.location.origin && !link.pathname.startsWith("/api/")) {
        event.preventDefault();
        const next = routeFromPath(link.pathname);
        window.history.pushState(null, "", `${link.pathname}${link.search}${link.hash}`);
        setRoute(next);
        window.scrollTo(0, 0);
      }
    };
    const updatePopState = () => {
      const next = getRoute();
      setRoute(next);
      window.scrollTo(0, 0);
    };
    document.addEventListener("click", updateRoute);
    window.addEventListener("popstate", updatePopState);
    return () => {
      document.removeEventListener("click", updateRoute);
      window.removeEventListener("popstate", updatePopState);
    };
  }, []);

  if (route.page === "signup")
    return <Signup onAuthenticated={onAuthenticated} />;
  if (route.page === "login")
    return <Login onAuthenticated={onAuthenticated} />;
  if (route.page === "result") return <Result />;
  if (route.page === "result-detail") return <ResultDetail />;
  if (route.page === "contact") return <Contact />;
  if (route.page === "store") return <Store />;
  if (route.page === "charge-history") return <ChargeHistory />;
  if (route.page === "charge-info") return <ChargeInfo />;
  if (route.page === "payment-result") return <PaymentResult />;
  if (route.page === "mypage") return <MyPage />;
  if (route.page === "mypage-me") return <MeEdit />;
  if (route.page === "mypage-card") return <CardEdit />;
  if (route.page === "mypage-record") return <Record />;
  if (route.page === "mypage-reservation") return <Reservation />;
  if (route.page === "mypage-password") return <ChangePW />;
  if (route.page === "mypage-identity") return <ItsMe />;
  if (route.page === "mypage-record-list") return <RecordList section={route.section} />;
  if (route.page === "session") return <Session sessionId={route.sessionId} />;
  return <Home />;
}
