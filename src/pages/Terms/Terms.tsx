import type { ReactNode } from "react";
import styled from "styled-components";
import MyPageFrame, { Panel } from "../MyPage/MyPageFrame";
import { findTerms, TERMS } from "../../features/terms/content";

/** 약관 및 정책 목록 (/terms). 로그인하지 않아도 볼 수 있다 */
export function TermsList() {
  return (
    <MyPageFrame title="약관 및 정책" backHref="/mypage">
      <Menu aria-label="약관 목록">
        {TERMS.map((item) => (
          <a key={item.slug} href={`/terms/${item.slug}`}>
            <span>
              {item.title}
              <small>시행일 {item.effectiveDate}</small>
            </span>
            <span aria-hidden="true">›</span>
          </a>
        ))}
      </Menu>
    </MyPageFrame>
  );
}

/** 약관 하나 (/terms/service, /terms/privacy) */
export function TermsDetail({ slug }: { slug: string }) {
  const terms = findTerms(slug);
  if (!terms) {
    return (
      <MyPageFrame title="약관 및 정책" backHref="/terms">
        <Panel>
          <p className="hint">찾는 약관이 없어요.</p>
        </Panel>
      </MyPageFrame>
    );
  }
  return (
    <MyPageFrame title={terms.title} backHref="/terms">
      <Document>{renderMarkdown(terms.body)}</Document>
    </MyPageFrame>
  );
}

// ===== content.ts의 간단한 마크다운을 그린다 =====

function renderInline(text: string): ReactNode {
  // **굵게**만 지원한다
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

function renderMarkdown(source: string): ReactNode[] {
  const blocks = source.split(/\n\s*\n/);
  return blocks.map((block, index) => {
    const lines = block.split("\n").filter((line) => line.trim());
    const first = lines[0]?.trim() ?? "";
    if (first.startsWith("## ")) return <h2 key={index}>{first.slice(3)}</h2>;
    if (first.startsWith("### ")) return <h3 key={index}>{first.slice(4)}</h3>;
    if (/^\*\*[^*]+\*\*$/.test(first) && lines.length === 1) {
      return <h4 key={index}>{first.slice(2, -2)}</h4>;
    }
    if (lines.every((line) => /^\d+\.\s/.test(line.trim()))) {
      return (
        <ol key={index}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.trim().replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }
    if (lines.every((line) => line.trim().startsWith("- "))) {
      return (
        <ul key={index}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.trim().slice(2))}</li>
          ))}
        </ul>
      );
    }
    if (lines.length >= 2 && lines.every((line) => line.trim().startsWith("|"))) {
      const [head, , ...rows] = lines;
      return (
        <div className="table" key={index}>
          <table>
            <thead>
              <tr>
                {cells(head).map((cell, i) => (
                  <th key={i}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {cells(row).map((cell, i) => (
                    <td key={i}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <p key={index}>{renderInline(lines.join(" "))}</p>;
  });
}

const Menu = styled.nav`
  display: grid;
  overflow: hidden;
  border-radius: 1.6rem;
  background: #fff;
  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 6.4rem;
    padding: 1.2rem 1.8rem;
    border-bottom: 0.1rem solid #eef1ec;
    color: #202820;
    font-size: 1.45rem;
    text-decoration: none;
  }
  a:last-child {
    border-bottom: 0;
  }
  a > span:first-child {
    display: grid;
    gap: 0.3rem;
  }
  small {
    color: #8a938b;
    font-size: 1.1rem;
  }
`;

const Document = styled.article`
  padding: 2rem 1.8rem 3rem;
  border-radius: 1.6rem;
  background: #fff;
  color: #2f3a32;
  font-size: 1.3rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
  h2 {
    margin: 0 0 0.6rem;
    color: #111;
    font-size: 1.9rem;
  }
  h3 {
    margin: 2.6rem 0 0.8rem;
    color: #202820;
    font-size: 1.55rem;
  }
  h4 {
    margin: 1.8rem 0 0.4rem;
    color: #202820;
    font-size: 1.35rem;
  }
  p {
    margin: 0.6rem 0;
  }
  ol,
  ul {
    margin: 0.4rem 0;
    padding-left: 2rem;
  }
  li + li {
    margin-top: 0.3rem;
  }
  .table {
    margin: 0.8rem 0;
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 32rem;
    border-collapse: collapse;
    font-size: 1.15rem;
  }
  th,
  td {
    padding: 0.7rem 0.8rem;
    border: 0.1rem solid #e3e8e0;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f5f7f3;
    color: #202820;
  }
`;
