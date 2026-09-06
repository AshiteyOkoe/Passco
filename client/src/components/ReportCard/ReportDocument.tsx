import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ReportData } from '../../utils/reportCard';
import ReportQr from './ReportQr';
import './ReportDocument.css';

interface ReportDocumentProps {
  data: ReportData;
  photoData?: string | null;
  className?: string;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function gradeTone(grade: string): string {
  const g = grade.replace('+', '').toUpperCase();
  if (g === 'A') return 'tone-a';
  if (g === 'B') return 'tone-b';
  if (g === 'C') return 'tone-c';
  if (g === 'D') return 'tone-d';
  return 'tone-f';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="rept-section-title">
      <h3>{children}</h3>
      <div className="rept-section-rule" />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rept-stat">
      <p className="rept-stat-label">{label}</p>
      <p className="rept-stat-value">{value}</p>
      {sub ? <p className="rept-stat-sub">{sub}</p> : null}
    </div>
  );
}

export default function ReportDocument({ data, photoData, className = '' }: ReportDocumentProps) {
  const o = data.meta.options;
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/report/${data.meta.verificationCode}`
      : `https://passco.app/verify/report/${data.meta.verificationCode}`;

  const gradeConfig = data.grading || [];
  const subjectHasData = data.subjects.length > 0;
  const trendHasData = data.trend.length > 0;

  return (
    <div className={`rept-root ${className}`}>
      {/* ============ PAGE 1 ============ */}
      <section className="rept-page" aria-label="Page 1 - Student information and subject performance">
        {/* Masthead */}
        <div className="rept-masthead">
          <div className="rept-brand">
            <div className="rept-logo-wrap">
              <img src="/images/logos/qna.svg" alt="" className="rept-logo" />
            </div>
            <div>
              <p className="rept-brand-name">PASSCO</p>
              <p className="rept-brand-tag">Practice · Assess · Succeed</p>
            </div>
          </div>
          <div className="rept-masthead-meta">
            <p className="rept-report-no">{data.meta.reportNumber}</p>
            <p className="rept-issued">Issued {fmtDate(data.meta.dateIssued)}</p>
          </div>
        </div>

        <div className="rept-titleband">
          <h1 className="rept-title">STUDENT ACADEMIC PERFORMANCE REPORT</h1>
          <p className="rept-subtitle">Academic Performance &amp; Learning Progress</p>
          <div className="rept-period-row">
            <span>Academic Year: <strong>{data.meta.academicYearLabel}</strong></span>
            <span>Term: <strong>{data.meta.term}</strong></span>
            <span>Reporting Period: <strong>{data.meta.periodLabel}</strong></span>
          </div>
        </div>

        {/* Student info */}
        <div className="rept-student">
          <div className="rept-student-fields">
            <div className="rept-field"><span>Student Name</span><strong>{data.student.name}</strong></div>
            <div className="rept-field"><span>Student ID</span><strong>{data.student.studentId}</strong></div>
            <div className="rept-field"><span>Class</span><strong>{data.student.classLabel}</strong></div>
            <div className="rept-field"><span>School</span><strong>{data.student.school || '—'}</strong></div>
          </div>
          {o.profilePhoto && (
            <div className="rept-photo">
              {photoData ? (
                <img src={photoData} alt="Student profile photo" className="rept-photo-img" />
              ) : (
                <span>
                  <span>Profile Photo</span>
                  <span>Not Available</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <SectionTitle>Academic Performance Summary</SectionTitle>
        <div className="rept-stats-grid">
          <StatCard label="Overall Score" value={`${data.summary.overallScore}%`} />
          <StatCard label="Average Score" value={`${data.summary.averageScore}%`} />
          <StatCard label="Assessments Taken" value={`${data.summary.assessmentsTaken}`} />
          <StatCard label="Accuracy" value={`${data.summary.accuracy}%`} />
        </div>
        <div className="rept-stat-line">
          <span>Questions Attempted: <strong>{data.summary.questionsAttempted}</strong></span>
          <span>Correct Answers: <strong>{data.summary.correctAnswers}</strong></span>
          <span>Avg Completion Time: <strong>{data.summary.avgCompletionMin} min</strong></span>
          <span>Best Score: <strong>{data.summary.bestScore}%</strong></span>
        </div>

        {/* Subject performance */}
        {o.subjectPerformance && subjectHasData && (
          <div className="rept-block">
            <SectionTitle>Subject Performance</SectionTitle>
            <table className="rept-table">
              <caption className="sr-only-print">Subject level performance summary</caption>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="num">Assessments</th>
                  <th className="num">Questions</th>
                  <th className="num">Score</th>
                  <th>Grade</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subjectKey}>
                    <td className="strong">{s.label}</td>
                    <td className="num">{s.assessments}</td>
                    <td className="num">{s.questions}</td>
                    <td className="num">{s.score}%</td>
                    <td><span className={`rept-grade ${gradeTone(s.grade)}`}>{s.grade}</span></td>
                    <td>{s.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grading system */}
        <div className="rept-block">
          <SectionTitle>Grading System</SectionTitle>
          <table className="rept-table grading">
            <caption className="sr-only-print">PASSCO grading scale</caption>
            <thead>
              <tr>
                <th>Grade</th>
                <th className="num">Score Range</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {gradeConfig.map((g) => (
                <tr key={g.grade}>
                  <td><span className={`rept-grade ${gradeTone(g.grade)}`}>{g.grade}</span></td>
                  <td className="num">{g.min === 0 ? 'Below 50' : `${g.min}\u2013${g.max}`}</td>
                  <td>{g.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rept-footer">
          <span>PASSCO · Student Academic Performance Report</span>
          <span>{data.meta.reportNumber} · Page 1 of 3</span>
          <span>Generated {fmtDate(data.meta.dateIssued)}</span>
        </div>
      </section>

      {/* ============ PAGE 2 ============ */}
      <section className="rept-page" aria-label="Page 2 - Trend, statistics and strengths">
        {/* Trend */}
        {o.performanceTrend && trendHasData && (
          <div className="rept-block">
            <SectionTitle>Performance Trend</SectionTitle>
            <p className="rept-note">
              Cumulative average score across assessments in this reporting period.
            </p>
            <div className="rept-chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pct" name="Score" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 2.5, fill: '#4f46e5' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Assessment statistics */}
        {o.assessmentStatistics && (
          <div className="rept-block">
            <SectionTitle>Assessment Statistics</SectionTitle>
            <div className="rept-stats-grid cols-5">
              <StatCard label="Completed" value={`${data.stats.completed}`} />
              <StatCard label="Quizzes" value={`${data.stats.quizzes}`} />
              <StatCard label="Mock Exams" value={`${data.stats.mocks}`} />
              <StatCard label="Full Exams" value={`${data.stats.exams}`} />
              <StatCard label="Avg Score" value={`${data.stats.avg}%`} />
            </div>
            <div className="rept-stat-line">
              <span>Questions Attempted: <strong>{data.stats.questionsAttempted}</strong></span>
              <span>Correct: <strong>{data.stats.correct}</strong></span>
              <span>Incorrect: <strong>{data.stats.incorrect}</strong></span>
              <span>Highest: <strong>{data.stats.highest}%</strong></span>
              <span>Lowest: <strong>{data.stats.lowest}%</strong></span>
              <span>Avg Time: <strong>{data.stats.avgCompletionMin} min</strong></span>
            </div>
          </div>
        )}

        {/* Strengths + improvements */}
        <div className="rept-two-col">
          {o.strengths && (
            <div className="rept-block">
              <SectionTitle>Academic Strengths</SectionTitle>
              {data.strengths.length > 0 ? (
                <ul className="rept-list">
                  {data.strengths.map((s) => (
                    <li key={s.subjectKey}>
                      <span className="rept-dot green" />
                      {s.label} — average score {s.avg}%
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rept-empty">No strengths recorded yet for this period.</p>
              )}
            </div>
          )}
          {o.improvements && (
            <div className="rept-block">
              <SectionTitle>Areas Requiring Improvement</SectionTitle>
              {data.improvements.length > 0 ? (
                <ul className="rept-list">
                  {data.improvements.map((s) => (
                    <li key={s.subjectKey}>
                      <span className="rept-dot amber" />
                      {s.label} — {s.level === 'needs' ? 'Needs Improvement' : 'Developing'} ({s.avg}%)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rept-empty">All subjects are at or above the target level.</p>
              )}
            </div>
          )}
        </div>

        <div className="rept-footer">
          <span>PASSCO · Student Academic Performance Report</span>
          <span>{data.meta.reportNumber} · Page 2 of 3</span>
          <span>Generated {fmtDate(data.meta.dateIssued)}</span>
        </div>
      </section>

      {/* ============ PAGE 3 ============ */}
      <section className="rept-page" aria-label="Page 3 - Habits, achievements, remark and verification">
        <div className="rept-two-col">
          {/* Learning habits */}
          <div className="rept-block">
            <SectionTitle>Learning Habits</SectionTitle>
            <div className="rept-stats-grid cols-3">
              <StatCard label="Study Sessions" value={`${data.habits.studySessions}`} />
              <StatCard label="Learning Days" value={`${data.habits.learningDays}`} />
              <StatCard label="Current Streak" value={`${data.habits.currentStreak}`} />
              <StatCard label="Longest Streak" value={`${data.habits.longestStreak}`} />
              <StatCard label="Questions Answered" value={`${data.habits.questionsAnswered}`} />
              <StatCard label="Weekly Practice Avg" value={`${data.habits.weeklyPracticeAvg}`} />
            </div>
          </div>

          {/* Achievements */}
          {o.achievements && (
            <div className="rept-block">
              <SectionTitle>Achievements</SectionTitle>
              {data.achievements.length > 0 ? (
                <ul className="rept-badges">
                  {data.achievements.map((name) => (
                    <li key={name} className="rept-badge"><span className="rept-medal">★</span>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="rept-empty">No achievements earned in this period yet - keep practising!</p>
              )}
            </div>
          )}
        </div>

        {/* Remark */}
        {o.teacherRemark && (
          <div className="rept-block">
            <SectionTitle>{data.remark.isSystem ? 'Platform Remark' : "Teacher's Remark"}</SectionTitle>
            <p className="rept-quote">“{data.remark.text}”</p>
            {!data.remark.isSystem && (
              <p className="rept-signature-line">
                <strong>{data.remark.teacherName || 'Authorized Teacher'}</strong>
                {data.remark.teacherTitle ? ` · ${data.remark.teacherTitle}` : ''} · {fmtDate(data.meta.dateIssued)}
              </p>
            )}
          </div>
        )}

        {/* Recommended next steps */}
        {o.recommendations && (
          <div className="rept-block">
            <SectionTitle>Recommended Next Steps</SectionTitle>
            <ol className="rept-list numbered">
              {data.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Overall result */}
        <SectionTitle>Overall Result</SectionTitle>
        <div className="rept-overall">
          <div className="rept-overall-score">
            <span className="rept-overall-label">Overall Performance</span>
            <span className="rept-overall-value">{data.overall.score}%</span>
          </div>
          <div className="rept-overall-detail">
            <p>Grade: <strong className={`rept-grade-lg ${gradeTone(data.overall.grade)}`}>{data.overall.grade}</strong></p>
            <p>Remark: <strong>{data.overall.remark}</strong></p>
            <p>
              Performance Status:{' '}
              <strong className={data.overall.status === 'PASS' ? 'text-pass' : 'text-review'}>
                {data.overall.status}
              </strong>
            </p>
          </div>
        </div>

        {/* Verification */}
        {o.verificationQr && (
          <div className="rept-verify">
            <div className="rept-verify-qr">
              <ReportQr value={verifyUrl} />
            </div>
            <div className="rept-verify-meta">
              <p className="rept-verify-title">Report Verification</p>
              <div className="rept-verify-row"><span>Report ID</span><strong>{data.meta.reportNumber}</strong></div>
              <div className="rept-verify-row"><span>Verification ID</span><strong>{data.meta.verificationCode}</strong></div>
              <div className="rept-verify-row"><span>Date Generated</span><strong>{fmtDate(data.meta.dateIssued)}</strong></div>
              <p className="rept-verify-note">
                Scan the QR code or visit <strong>{verifyUrl}</strong> to confirm this report was genuinely generated by PASSCO.
              </p>
            </div>
          </div>
        )}

        <div className="rept-footer">
          <span>PASSCO · Student Academic Performance Report</span>
          <span>{data.meta.reportNumber} · Page 3 of 3</span>
          <span>Generated {fmtDate(data.meta.dateIssued)}</span>
        </div>
      </section>
    </div>
  );
}