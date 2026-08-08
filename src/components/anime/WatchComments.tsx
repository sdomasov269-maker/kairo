"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DetailSectionHeading } from "./DetailSectionHeading";

type CommentDto = {
  id: string;
  parentId: string | null;
  body: string;
  spoiler: boolean;
  createdAt: string;
  user: { id: string; displayName: string; image: string | null };
};

export function WatchComments({
  animeId,
  seasonNumber,
  episodeNumber,
}: {
  animeId: string;
  seasonNumber?: number;
  episodeNumber?: number;
}) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch(`/api/comments?animeId=${encodeURIComponent(animeId)}`)
      .then((response) => (response.ok ? response.json() : { comments: [] }))
      .then((payload) => {
        if (active) setComments(payload.comments ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [animeId]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        animeId,
        body: trimmed,
        spoiler,
        ...(replyTo ? { parentId: replyTo } : {}),
        ...(seasonNumber ? { seasonNumber } : {}),
        ...(episodeNumber ? { episodeNumber } : {}),
      }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setComments((current) => [payload.comment, ...current]);
    setBody("");
    setSpoiler(false);
    setReplyTo(null);
  };

  return (
    <section className="watch-comments" aria-labelledby="comments-title">
      <DetailSectionHeading
        number={2}
        title="Комментарии"
        titleId="comments-title"
      />
      {status === "authenticated" ? (
        <div className="comments-card">
          <div className="comment-composer">
            <div className="comment-composer-identity">
              <div className="comment-avatar" aria-hidden="true">
                {(session?.user?.name ?? session?.user?.email ?? "K")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <strong>
                {session?.user?.name ?? session?.user?.email ?? "Kairo"}
              </strong>
            </div>
            {replyTo && (
              <small>
                Ответ на комментарий{" "}
                <button onClick={() => setReplyTo(null)}>Отменить</button>
              </small>
            )}
            <textarea
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Поделитесь впечатлениями"
              rows={3}
              value={body}
            />
            <div>
              <label>
                <input
                  checked={spoiler}
                  onChange={(event) => setSpoiler(event.target.checked)}
                  type="checkbox"
                />{" "}
                Спойлер
              </label>
              <button
                className="button button-primary"
                disabled={!body.trim()}
                onClick={submit}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="comments-card comments-login-card">
          <p>Чтобы участвовать в обсуждении, войдите в профиль.</p>
          <Link
            className="button button-primary detail-card-action"
            href="/login"
          >
            Войти
          </Link>
        </div>
      )}
      <div className="comment-list">
        {comments.map((comment) => {
          const hidden = comment.spoiler && !revealed.has(comment.id);
          return (
            <article
              className={comment.parentId ? "is-reply" : ""}
              key={comment.id}
            >
              <div className="comment-avatar">
                {comment.user.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <header>
                  <strong>{comment.user.displayName}</strong>
                  <time>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </header>
                {hidden ? (
                  <button
                    className="comment-spoiler"
                    onClick={() =>
                      setRevealed((current) => new Set(current).add(comment.id))
                    }
                  >
                    Спойлер · показать
                  </button>
                ) : (
                  <p>{comment.body}</p>
                )}
                {status === "authenticated" && (
                  <button
                    className="comment-reply"
                    onClick={() => setReplyTo(comment.id)}
                  >
                    Ответить
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
