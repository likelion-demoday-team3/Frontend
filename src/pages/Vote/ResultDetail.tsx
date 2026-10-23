import { useState } from "react";
import type { MouseEvent } from "react";
import styled from "styled-components";
import PageHeader from "../../components/common/PageHeader";

const lockedSections = [
  {
    id: 3,
    title: "나의 1순위가 선택한 사람들",
    people: ["달빛수집가", "초록새벽"],
  },
  {
    id: 4,
    title: "나를 1순위로 선택한 사람들",
    people: ["구름산책", "포근한오후"],
  },
  {
    id: 5,
    title: "나의 1순위를 선택한 사람들",
    people: ["느린토끼", "햇살한스푼"],
  },
];

export default function ResultDetail() {
  const mockMode = false;
  const [gems, setGems] = useState(5);
  const [unlocked, setUnlocked] = useState<number[]>([]);

  function unlock(sectionId: number) {
    if (gems < 1 || unlocked.includes(sectionId)) return;
    setGems((value) => value - 1);
    setUnlocked((value) => [...value, sectionId]);
  }
  function goToContact(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    event.stopPropagation();
    window.history.pushState(null, "", "/contact");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <DetailPage>
      <PageHeader title="투표 결과" gems={gems} onGemsChange={setGems} />
      <main>
        {!mockMode ? <section className="pending-card" role="status"><h2>상세 결과 API 연결 준비 중</h2><p>매칭 커플 수 요약 API 경로를 확인했어요. 응답 형식을 확인한 뒤 연결할게요. 상세 결과와 보석 차감은 별도 API 명세가 필요해요.</p></section> : <>
        <p className="intro">이번 세션의 투표 결과를 확인해보세요. <span>미리보기</span></p>

        <section className="summary-card match-count">
          <span className="section-number">01</span>
          <div>
            <h2>매칭된 커플 수</h2>
            <p>서로를 1순위로 선택한 커플</p>
          </div>
          <strong className="count">
            3<span>커플</span>
          </strong>
        </section>

        <section className="summary-card crossed-count">
          <span className="section-number">02</span>
          <div>
            <h2>아쉽게 엇갈린 커플 수</h2>
            <p>한 사람은 1순위, 다른 사람은 2순위로 선택</p>
          </div>
          <strong className="count">
            2<span>커플</span>
          </strong>
        </section>

        {lockedSections.map((section) => {
          const isUnlocked = unlocked.includes(section.id);
          return (
            <section
              className={`people-card${isUnlocked ? " is-unlocked" : ""}`}
              key={section.id}
            >
              <div className="people-heading">
                <span className="section-number">0{section.id}</span>
                <h2>{section.title}</h2>
              </div>
              {isUnlocked ? (
                <ul aria-label={section.title}>
                  {section.people.map((person, index) => (
                    <li key={person}>
                      <span className={`avatar tone-${index % 2}`}>
                        {Array.from(person)[0]}
                      </span>
                      <span>{person}</span>
                      <span className="small-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="locked-content">
                  <button
                    type="button"
                    disabled={gems < 1}
                    onClick={() => unlock(section.id)}
                  >
                    보석 1개로 열람
                  </button>
                </div>
              )}
            </section>
          );
        })}
        </>}
      </main>
      <a className="next-button" href="/contact" onClick={goToContact}>
        마지막 단계로 가기
      </a>
    </DetailPage>
  );
}

const DetailPage = styled.div`
  width: 100%;
  max-width: 43rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(1.2rem + env(safe-area-inset-top)) 2.4rem
    calc(9rem + env(safe-area-inset-bottom));
  background: var(--background);
  color: var(--ink);
  box-shadow: 0 0 6rem #26372508;

  .intro {
    margin: 2rem 0 1.8rem;
    color: #818a7f;
    font-size: 1.3rem;
  }
  .intro span { margin-left: .5rem; padding: .3rem .7rem; border-radius: 99rem; background: #f2ffd1; color: #6c832f; font-size: 1rem; }
  .pending-card { display: grid; min-height: 30rem; align-content: center; justify-items: center; gap: 1rem; padding: 2rem; border: 1px solid #e4e9df; border-radius: 1.8rem; background: white; text-align: center; }
  .pending-card h2 { font: 400 1.9rem/1.4 var(--display-font); }
  .pending-card p { max-width: 28rem; color: #818a7f; font-size: 1.25rem; line-height: 1.7; }
  .summary-card,
  .people-card {
    margin-bottom: 1.2rem;
    border: 1px solid #e4e9df;
    border-radius: 1.8rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.8rem #26372508;
  }
  .summary-card {
    display: grid;
    grid-template-columns: 3.2rem 1fr auto;
    align-items: center;
    gap: 1rem;
    min-height: 9rem;
    padding: 1.4rem;
  }
  .match-count {
    background: #f5faea;
  }
  .crossed-count {
    background: #fffaf2;
  }
  .section-number {
    display: grid;
    width: 3rem;
    height: 3rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 1rem;
    background: #eaf3d7;
    color: #68862d;
    font-size: 1.1rem;
    font-weight: 800;
  }
  .crossed-count .section-number {
    background: #f8ebd9;
    color: #9a7548;
  }
  .summary-card h2,
  .people-card h2 {
    color: #283027;
    font: 400 1.55rem/1.4 var(--display-font);
  }
  .summary-card p {
    margin-top: 0.4rem;
    color: #899188;
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .count {
    color: #66852b;
    font: 400 2.3rem/1 var(--display-font);
    white-space: nowrap;
  }
  .crossed-count .count {
    color: #a17a4c;
  }
  .count span {
    margin-left: 0.3rem;
    font: 500 1.1rem var(--font-body);
  }
  .people-card {
    padding: 1.6rem;
  }
  .people-heading {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .people-heading h2 {
    font-size: 1.6rem;
  }
  .locked-content {
    display: flex;
    min-height: 15rem;
    align-items: center;
    justify-content: center;
    margin-top: 1.4rem;
    border-radius: 1.3rem;
    background: #f7f9f4;
  }
  .locked-content button {
    min-width: 17rem;
    min-height: 4rem;
    padding: 0.8rem 1.2rem;
    border: 0;
    border-radius: 1rem;
    background: var(--green);
    color: var(--ink);
    font-size: 1.25rem;
    font-weight: 700;
  }
  .locked-content button:disabled {
    background: #e4e8df;
    color: #929a8d;
  }
  .people-card ul {
    display: grid;
    gap: 0.5rem;
    margin: 1.4rem 0 0;
    padding: 0;
    list-style: none;
  }
  .people-card li {
    display: flex;
    min-height: 5.6rem;
    align-items: center;
    gap: 1rem;
    padding: 0 0.8rem;
    border-radius: 1rem;
    background: #f7f9f4;
    font-size: 1.3rem;
    font-weight: 600;
  }
  .avatar {
    display: grid;
    width: 3.6rem;
    height: 3.6rem;
    place-items: center;
    border-radius: 50%;
    background: #edf4dd;
    color: #65852b;
    font: 400 1.7rem var(--display-font);
  }
  .avatar.tone-1 {
    background: #f8ebd9;
    color: #94714b;
  }
  .small-arrow {
    margin-left: auto;
    color: #a5ad9d;
    font-size: 1.6rem;
  }
  .next-button {
    display: flex;
    min-height: 5.2rem;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    border-radius: 1.4rem;
    background: #011020;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 37.4rem) {
    padding-right: 2.4rem;
    padding-left: 2.4rem;
  }
`;
