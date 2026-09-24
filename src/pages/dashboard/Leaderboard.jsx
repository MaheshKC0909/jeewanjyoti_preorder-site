import React, { useState, useEffect, useCallback } from 'react';
import { Facebook, Instagram, X, MessageCircle, Phone, Mail, Link2, Share2 } from 'lucide-react';
import { getLeaderboard, getDailyLeaderboard, getLeaderboardPosts, createLeaderboardPost, updateLeaderboardPost, deleteLeaderboardPost, getLeaderboardChallenges, createLeaderboardChallenge, getPostLikes, toggleLikePost, getPostComments, addPostComment, updateComment, deleteComment, getChallengeLikes, toggleLikeChallenge, getChallengeComments, addChallengeComment, updateChallengeComment, deleteChallengeComment } from '../../lib/api';
import { getUserData } from '../../lib/tokenManager';

const API_BASE_URL = 'https://jeewanjyoti-backend.smart.org.np';

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_BASE_URL}${imagePath}`;
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const getChallengeStatus = (startDate, endDate) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && now < start) return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' };
  if (end && now > end) return { label: 'Ended', className: 'bg-slate-200 text-slate-600' };
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' };
};

function LeaderAvatar({ name, imageUrl, size = 'h-8 w-8' }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${size} rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${size} rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold text-white`}>
      {initial}
    </div>
  );
}

function Sidebar({ leaders, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold">Weekly Leaderboard</h2>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-bold">Weekly Leaderboard</h2>
        <div className="max-h-[40vh] overflow-y-auto pr-1">
          {leaders && leaders.length > 0 ? (
            leaders.map((user, index) => (
              <div key={user.user_id || index} className="flex items-center justify-between border-b py-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-gray-700">
                  <LeaderAvatar name={user.name} imageUrl={getFullImageUrl(user.profile_image)} />
                  <div>
                    <div className="flex items-center gap-1">
                      <span>{user.badge}</span>
                      <span>{user.name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{user.steps.toLocaleString()} steps</div>
                  <div className="text-xs text-gray-500">{user.distance.toFixed(1)} km</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No leaders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyLeaderboard({ leaders, loading = false }) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-4 text-lg font-bold">Daily Leaderboard</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <h2 className="mb-4 text-lg font-bold">Daily Leaderboard</h2>
      <div className="max-h-[40vh] overflow-y-auto pr-1">
        {leaders && leaders.length > 0 ? (
          leaders.map((user, index) => (
            <div key={user.user_id || index} className="flex items-center justify-between border-b py-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-gray-700">
                <LeaderAvatar name={user.name} imageUrl={getFullImageUrl(user.profile_image)} />
                <div>
                  <div className="flex items-center gap-1">
                    <span>{user.badge}</span>
                    <span>{user.name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{user.steps.toLocaleString()} steps</div>
                <div className="text-xs text-gray-500">{user.distance.toFixed(1)} km</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No leaders yet</p>
        )}
      </div>
    </div>
  );
}

const EMPTY_CHALLENGE_FORM = {
  name: '',
  description: '',
  goal: '',
  steps: '',
  distance: '',
  calories: '',
  start_date: '',
  end_date: '',
  imageFile: null,
};

const METRIC_CONFIG = [
  { key: 'calories', label: 'Calories', format: (v) => Math.round(v || 0).toLocaleString() },
  { key: 'distance', label: 'Distance', format: (v) => `${(v || 0).toFixed(1)} km` },
  { key: 'steps', label: 'Steps', format: (v) => (v || 0).toLocaleString() },
];

function PostMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Post options"
        className="rounded-full px-2 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit(); }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExpandableImage({ src, alt, className }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setExpanded(true)}
        className={`${className} cursor-zoom-in`}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close"
            className="absolute right-4 top-4 text-2xl text-white/80 transition-colors hover:text-white"
          >
            ✕
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

async function tryNativeShare({ text, imageUrl }) {
  if (!navigator.share) return false;

  if (imageUrl && navigator.canShare) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], imageUrl.split('/').pop() || 'post.jpg', { type: blob.type || 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Digital Care', text, files: [file] });
        return true;
      }
    } catch (fileError) {
      console.warn('Unable to share image file, falling back to link share:', fileError);
    }
  }

  try {
    await navigator.share({ title: 'Digital Care', text, url: imageUrl || undefined });
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') return true;
    console.warn('Native share failed:', error);
    return false;
  }
}

function ShareModal({ post, onClose }) {
  const imageUrl = post.image ? getFullImageUrl(post.image) : null;
  const shareText = post.summary || 'Check out this update on Digital Care!';
  const shareUrl = imageUrl || window.location.origin;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const openWindow = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleInstagramClick = async () => {
    const shared = await tryNativeShare({ text: shareText, imageUrl });
    if (!shared) {
      alert("Instagram doesn't support sharing directly from a website. Use Copy Link, then paste it into Instagram yourself.");
    }
    onClose();
  };

  const handleMoreClick = async () => {
    const shared = await tryNativeShare({ text: shareText, imageUrl });
    if (shared) onClose();
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('Check this out')}&body=${encodedText}%20${encodedUrl}`;
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl || shareText);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
    onClose();
  };

  const targets = [
    { key: 'facebook', label: 'Facebook', icon: Facebook, bg: 'bg-[#1877F2]', onClick: () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`) },
    { key: 'x', label: 'X', icon: X, bg: 'bg-black', onClick: () => openWindow(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`) },
    { key: 'instagram', label: 'Instagram', icon: Instagram, bg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]', onClick: handleInstagramClick },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, bg: 'bg-[#25D366]', onClick: () => openWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`) },
    { key: 'viber', label: 'Viber', icon: Phone, bg: 'bg-[#7360F2]', onClick: () => openWindow(`viber://forward?text=${encodedText}%20${encodedUrl}`) },
    { key: 'email', label: 'Email', icon: Mail, bg: 'bg-slate-500', onClick: handleEmailClick },
    { key: 'copy', label: 'Copy Link', icon: Link2, bg: 'bg-slate-400', onClick: handleCopyLink },
  ];

  if (navigator.share) {
    targets.push({ key: 'more', label: 'More', icon: Share2, bg: 'bg-slate-600', onClick: handleMoreClick });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Share post</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition-colors hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {targets.map(({ key, label, icon: Icon, bg, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="flex flex-col items-center gap-1.5 text-xs font-medium text-slate-600"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm ${bg}`}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareButton({ post }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 transition-colors hover:text-blue-600"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && <ShareModal post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

function CommentMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Comment options"
        className="rounded-full px-1.5 py-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit(); }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete(); }}
              className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CommentSection({ postId, commentData, onAddComment, currentUserId, onEditComment, onDeleteComment }) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const comments = commentData?.list ?? [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    try {
      setSubmitting(true);
      await onAddComment(postId, text);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const submitEdit = async (event, commentId) => {
    event.preventDefault();
    const text = editText.trim();
    if (!text) return;
    try {
      setEditSubmitting(true);
      await onEditComment(postId, commentId, text);
      setEditingId(null);
      setEditText('');
    } finally {
      setEditSubmitting(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (commentId) => {
    setDeleteConfirmId(commentId);
  };

  const confirmDelete = () => {
    onDeleteComment(postId, deleteConfirmId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
        {comments.length > 0 ? (
          comments.map((comment) => {
            const canManage = currentUserId != null && comment.user != null && Number(comment.user) === Number(currentUserId);
            const isEditing = editingId === comment.id;
            return (
              <div key={comment.id} className="flex items-start gap-2">
                <LeaderAvatar name={comment.user_name} imageUrl={getFullImageUrl(comment.profile_image)} size="h-7 w-7" />
                <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-slate-700">{comment.user_name}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className="text-[10px] text-slate-400">{formatTimeAgo(comment.created_at)}</p>
                      {canManage && !isEditing && (
                        <CommentMenu onEdit={() => startEdit(comment)} onDelete={() => handleDelete(comment.id)} />
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <form onSubmit={(event) => submitEdit(event, comment.id)} className="mt-1 flex gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 rounded-full border border-slate-200 px-3 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={editSubmitting || !editText.trim()}
                        className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <p className="mt-0.5 text-sm text-slate-600">{comment.comment}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-xs text-slate-400">No comments yet</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '…' : 'Post'}
        </button>
      </form>
      <ConfirmDialog
        open={deleteConfirmId != null}
        title="Delete comment?"
        message="This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}

function PostCard({ post, index, currentUserId, onEdit, onDelete, likeData, onToggleLike, commentData, onAddComment, onEditComment, onDeleteComment }) {
  const canManage = currentUserId != null && post.user != null && Number(post.user) === Number(currentUserId);
  const likeCount = likeData?.count ?? 0;
  const likedByMe = likeData?.likedByMe ?? false;
  const commentCount = commentData?.count ?? 0;
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-[fadeIn_0.4s_ease-out_both] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="flex items-center gap-3">
        <LeaderAvatar name={post.user_name} imageUrl={getFullImageUrl(post.profile_image)} size="h-10 w-10" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{post.user_name}</h3>
          <p className="text-xs text-slate-400">{formatTimeAgo(post.created_at)}</p>
        </div>
        {canManage && <PostMenu onEdit={() => onEdit(post)} onDelete={() => onDelete(post.id)} />}
      </header>

      {post.image && (
        <ExpandableImage
          src={getFullImageUrl(post.image)}
          alt={post.user_name}
          className="mt-4 h-auto max-h-[36rem] w-full rounded-xl border border-slate-100 object-contain"
        />
      )}

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {post.summary || 'Shared an update.'}
      </p>

      {(post.calories || post.distance || post.steps) ? (
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
          {METRIC_CONFIG.map(({ key, label, format }) => (
            <div key={key} className="px-3 py-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-base font-bold text-blue-700">{format(post[key])}</p>
            </div>
          ))}
        </div>
      ) : null}

      <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          className={`flex items-center gap-1.5 transition-colors hover:text-red-600 ${likedByMe ? 'text-red-600' : ''}`}
        >
          <span>{likedByMe ? '❤️' : '🤍'}</span> {likeCount}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 transition-colors hover:text-blue-600 ${commentsOpen ? 'text-blue-600' : ''}`}
        >
          <span>💬</span> {commentCount}
        </button>
        <ShareButton post={post} />
      </footer>

      {commentsOpen && (
        <CommentSection
          postId={post.id}
          commentData={commentData}
          onAddComment={onAddComment}
          currentUserId={currentUserId}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </article>
  );
}

const CHALLENGE_METRIC_CONFIG = [
  { key: 'steps', label: 'Step Goal', format: (v) => (v ? Number(v).toLocaleString() : '—') },
  { key: 'distance', label: 'Distance Goal', format: (v) => (v ? `${Number(v).toFixed(1)} km` : '—') },
  { key: 'calories', label: 'Calorie Goal', format: (v) => (v ? Math.round(Number(v)).toLocaleString() : '—') },
];

function ChallengeCard({ challenge, index, currentUserId, likeData, onToggleLike, commentData, onAddComment, onEditComment, onDeleteComment }) {
  const status = getChallengeStatus(challenge.start_date, challenge.end_date);
  const likeCount = likeData?.count ?? 0;
  const likedByMe = likeData?.likedByMe ?? false;
  const commentCount = commentData?.count ?? 0;
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-[fadeIn_0.4s_ease-out_both] rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-lg text-white shadow-sm">
          🏆
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Challenge
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
              {status.label}
            </span>
          </div>
          <h3 className="mt-1 truncate text-base font-bold text-slate-900">{challenge.name}</h3>
          {challenge.user_name && (
            <p className="text-xs text-slate-400">Created by {challenge.user_name}</p>
          )}
        </div>
      </header>

      {challenge.image && (
        <ExpandableImage
          src={getFullImageUrl(challenge.image)}
          alt={challenge.name}
          className="mt-4 h-auto max-h-[36rem] w-full rounded-xl border border-amber-100 object-contain"
        />
      )}

      {challenge.description && (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{challenge.description}</p>
      )}

      <div className="mt-4 grid grid-cols-3 divide-x divide-amber-100 rounded-xl border border-amber-100 bg-amber-50/60">
        {CHALLENGE_METRIC_CONFIG.map(({ key, label, format }) => (
          <div key={key} className="px-3 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700/70">{label}</p>
            <p className="mt-1 text-base font-bold text-amber-700">{format(challenge[key])}</p>
          </div>
        ))}
      </div>

      <footer className="mt-4 flex items-center justify-center gap-2 border-t border-amber-100 pt-3 text-sm font-medium text-slate-500">
        <span>📅</span>
        <span>{formatDate(challenge.start_date)} – {formatDate(challenge.end_date)}</span>
      </footer>

      <footer className="mt-3 flex items-center justify-between border-t border-amber-100 pt-3 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => onToggleLike(challenge.id)}
          className={`flex items-center gap-1.5 transition-colors hover:text-amber-600 ${likedByMe ? 'text-amber-600' : ''}`}
        >
          <span>{likedByMe ? '⭐' : '☆'}</span> {likeCount}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 transition-colors hover:text-blue-600 ${commentsOpen ? 'text-blue-600' : ''}`}
        >
          <span>💬</span> {commentCount}
        </button>
      </footer>

      {commentsOpen && (
        <CommentSection
          postId={challenge.id}
          commentData={commentData}
          onAddComment={onAddComment}
          currentUserId={currentUserId}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </article>
  );
}

function buildFeedItems(posts, challenges) {
  const postItems = (posts || []).map((post) => ({
    type: 'post',
    key: `post-${post.id}`,
    sortKey: post.created_at || 0,
    data: post,
  }));
  const challengeItems = (challenges || []).map((challenge) => ({
    type: 'challenge',
    key: `challenge-${challenge.id}`,
    sortKey: challenge.created_at || 0,
    data: challenge,
  }));

  return [...postItems, ...challengeItems].sort(
    (a, b) => new Date(b.sortKey) - new Date(a.sortKey)
  );
}

function Feed({ posts, challenges, loading = false, currentUserId, onEdit, onDelete, postLikes, onToggleLike, postComments, onAddComment, onEditComment, onDeleteComment, challengeLikes, onToggleChallengeLike, challengeComments, onAddChallengeComment, onEditChallengeComment, onDeleteChallengeComment }) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const feedItems = buildFeedItems(posts, challenges);

  if (feedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {feedItems.map((item, index) =>
        item.type === 'challenge' ? (
          <ChallengeCard
            key={item.key}
            challenge={item.data}
            index={index}
            currentUserId={currentUserId}
            likeData={challengeLikes?.[item.data.id]}
            onToggleLike={onToggleChallengeLike}
            commentData={challengeComments?.[item.data.id]}
            onAddComment={onAddChallengeComment}
            onEditComment={onEditChallengeComment}
            onDeleteComment={onDeleteChallengeComment}
          />
        ) : (
          <PostCard
            key={item.key}
            post={item.data}
            index={index}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
            likeData={postLikes?.[item.data.id]}
            onToggleLike={onToggleLike}
            commentData={postComments?.[item.data.id]}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
          />
        )
      )}
    </div>
  );
}

function RightSidebar({ challenges = [] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Trending Challenges
        </h2>
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
        {challenges.length > 0 ? (
          challenges.map((challenge) => (
            <div
              key={challenge}
              className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-sm text-slate-700"
            >
              <span>🏆</span>
              <span className="truncate">{challenge}</span>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">No challenges yet</p>
        )}
      </div>
    </section>
  );
}

export default function LeaderboardTab() {
  const [leaders, setLeaders] = useState([]);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [dailyLeaders, setDailyLeaders] = useState([]);
  const [dailyLeadersLoading, setDailyLeadersLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [formData, setFormData] = useState({ summary: '', is_completed: false, photoFile: null });
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [showChallengeComposer, setShowChallengeComposer] = useState(false);
  const [challengeFormData, setChallengeFormData] = useState(EMPTY_CHALLENGE_FORM);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [challengeError, setChallengeError] = useState(null);
  const [currentUserId] = useState(() => getUserData()?.id ?? null);
  const [postLikes, setPostLikes] = useState({});
  const [postComments, setPostComments] = useState({});
  const [challengeLikes, setChallengeLikes] = useState({});
  const [challengeComments, setChallengeComments] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [editFormData, setEditFormData] = useState({ summary: '', is_completed: false, photoFile: null });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deletePostId, setDeletePostId] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLeadersLoading(true);
      const data = await getLeaderboard();
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        setLeaders(data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLeadersLoading(false);
    }
  }, []);

  const fetchDailyLeaderboard = useCallback(async () => {
    try {
      setDailyLeadersLoading(true);
      const data = await getDailyLeaderboard();
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        setDailyLeaders(data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching daily leaderboard:', error);
    } finally {
      setDailyLeadersLoading(false);
    }
  }, []);

  const fetchPostLikes = useCallback(async (postList) => {
    const entries = await Promise.all(
      (postList || []).map(async (post) => {
        try {
          const data = await getPostLikes(post.id);
          const likedByMe = Array.isArray(data.likes) && data.likes.some((l) => Number(l.user) === Number(currentUserId));
          return [post.id, { count: data.like_count || 0, likedByMe }];
        } catch (error) {
          console.error(`Error fetching likes for post ${post.id}:`, error);
          return [post.id, { count: 0, likedByMe: false }];
        }
      })
    );
    setPostLikes(Object.fromEntries(entries));
  }, [currentUserId]);

  const fetchPostComments = useCallback(async (postList) => {
    const entries = await Promise.all(
      (postList || []).map(async (post) => {
        try {
          const data = await getPostComments(post.id);
          return [post.id, { count: data.comment_count || 0, list: data.comments || [] }];
        } catch (error) {
          console.error(`Error fetching comments for post ${post.id}:`, error);
          return [post.id, { count: 0, list: [] }];
        }
      })
    );
    setPostComments(Object.fromEntries(entries));
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      const data = await getLeaderboardPosts();
      setPosts(data);
      fetchPostLikes(data);
      fetchPostComments(data);
    } catch (error) {
      console.error('Error fetching leaderboard posts:', error);
    } finally {
      setPostsLoading(false);
    }
  }, [fetchPostLikes, fetchPostComments]);

  const handleAddComment = useCallback(async (postId, text) => {
    try {
      await addPostComment(postId, text);
      const data = await getPostComments(postId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to add comment to post ${postId}:`, error);
    }
  }, []);

  const handleEditComment = useCallback(async (postId, commentId, text) => {
    try {
      await updateComment(postId, commentId, text);
      const data = await getPostComments(postId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
    }
  }, []);

  const handleDeleteComment = useCallback(async (postId, commentId) => {
    try {
      await deleteComment(postId, commentId);
      const data = await getPostComments(postId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to delete comment ${commentId}:`, error);
    }
  }, []);

  const handleToggleLike = useCallback(async (postId) => {
    try {
      const data = await toggleLikePost(postId);
      setPostLikes((prev) => ({
        ...prev,
        [postId]: { count: data.like_count || 0, likedByMe: !!data.liked },
      }));
    } catch (error) {
      console.error(`Failed to toggle like for post ${postId}:`, error);
      fetchPostLikes(posts);
    }
  }, [fetchPostLikes, posts]);

  const fetchChallengeLikes = useCallback(async (challengeList) => {
    const entries = await Promise.all(
      (challengeList || []).map(async (challenge) => {
        try {
          const data = await getChallengeLikes(challenge.id);
          const likedByMe = Array.isArray(data.likes) && data.likes.some((l) => Number(l.user) === Number(currentUserId));
          return [challenge.id, { count: data.like_count || 0, likedByMe }];
        } catch (error) {
          console.error(`Error fetching likes for challenge ${challenge.id}:`, error);
          return [challenge.id, { count: 0, likedByMe: false }];
        }
      })
    );
    setChallengeLikes(Object.fromEntries(entries));
  }, [currentUserId]);

  const fetchChallengeComments = useCallback(async (challengeList) => {
    const entries = await Promise.all(
      (challengeList || []).map(async (challenge) => {
        try {
          const data = await getChallengeComments(challenge.id);
          return [challenge.id, { count: data.comment_count || 0, list: data.comments || [] }];
        } catch (error) {
          console.error(`Error fetching comments for challenge ${challenge.id}:`, error);
          return [challenge.id, { count: 0, list: [] }];
        }
      })
    );
    setChallengeComments(Object.fromEntries(entries));
  }, []);

  const fetchChallenges = useCallback(async () => {
    try {
      const data = await getLeaderboardChallenges();
      setChallenges(data);
      fetchChallengeLikes(data);
      fetchChallengeComments(data);
    } catch (error) {
      console.error('Error fetching leaderboard challenges:', error);
    }
  }, [fetchChallengeLikes, fetchChallengeComments]);

  const handleAddChallengeComment = useCallback(async (challengeId, text) => {
    try {
      await addChallengeComment(challengeId, text);
      const data = await getChallengeComments(challengeId);
      setChallengeComments((prev) => ({
        ...prev,
        [challengeId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to add comment to challenge ${challengeId}:`, error);
    }
  }, []);

  const handleEditChallengeComment = useCallback(async (challengeId, commentId, text) => {
    try {
      await updateChallengeComment(challengeId, commentId, text);
      const data = await getChallengeComments(challengeId);
      setChallengeComments((prev) => ({
        ...prev,
        [challengeId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
    }
  }, []);

  const handleDeleteChallengeComment = useCallback(async (challengeId, commentId) => {
    try {
      await deleteChallengeComment(challengeId, commentId);
      const data = await getChallengeComments(challengeId);
      setChallengeComments((prev) => ({
        ...prev,
        [challengeId]: { count: data.comment_count || 0, list: data.comments || [] },
      }));
    } catch (error) {
      console.error(`Failed to delete comment ${commentId}:`, error);
    }
  }, []);

  const handleToggleChallengeLike = useCallback(async (challengeId) => {
    try {
      const data = await toggleLikeChallenge(challengeId);
      setChallengeLikes((prev) => ({
        ...prev,
        [challengeId]: { count: data.like_count || 0, likedByMe: !!data.liked },
      }));
    } catch (error) {
      console.error(`Failed to toggle like for challenge ${challengeId}:`, error);
      fetchChallengeLikes(challenges);
    }
  }, [fetchChallengeLikes, challenges]);

  useEffect(() => {
    fetchLeaderboard();
    fetchDailyLeaderboard();
    fetchPosts();
    fetchChallenges();
  }, [fetchLeaderboard, fetchDailyLeaderboard, fetchPosts, fetchChallenges]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, photoFile: file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.summary.trim() && !formData.photoFile) return;

    const payload = new FormData();
    payload.append('summary', formData.summary);
    payload.append('is_completed', String(formData.is_completed));
    if (formData.photoFile) {
      payload.append('image', formData.photoFile);
    }

    try {
      setPosting(true);
      setPostError(null);
      await createLeaderboardPost(payload);

      setFormData({ summary: '', is_completed: false, photoFile: null });
      setShowComposer(false);
      fetchPosts();
      fetchLeaderboard();
      fetchDailyLeaderboard();
    } catch (error) {
      console.error('Failed to create post:', error);
      setPostError(error.message || 'Failed to share progress. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleChallengeFieldChange = (field) => (event) => {
    setChallengeFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleChallengeImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setChallengeFormData((prev) => ({ ...prev, imageFile: file }));
  };

  const handleAddChallenge = async (event) => {
    event.preventDefault();
    const name = challengeFormData.name.trim();
    if (!name) return;

    const payload = new FormData();
    payload.append('name', name);
    payload.append('description', challengeFormData.description);
    payload.append('goal', challengeFormData.goal);
    payload.append('steps', challengeFormData.steps);
    payload.append('distance', challengeFormData.distance);
    payload.append('calories', challengeFormData.calories);
    payload.append('start_date', challengeFormData.start_date);
    payload.append('end_date', challengeFormData.end_date);
    if (challengeFormData.imageFile) {
      payload.append('image', challengeFormData.imageFile);
    }

    try {
      setChallengeSubmitting(true);
      setChallengeError(null);
      await createLeaderboardChallenge(payload);

      setChallengeFormData(EMPTY_CHALLENGE_FORM);
      setShowChallengeComposer(false);
      fetchChallenges();
    } catch (error) {
      console.error('Failed to create challenge:', error);
      setChallengeError(error.message || 'Failed to create challenge. Please try again.');
    } finally {
      setChallengeSubmitting(false);
    }
  };

  const openEditPost = (post) => {
    setEditError(null);
    setEditFormData({
      summary: post.summary || '',
      is_completed: !!post.is_completed,
      photoFile: null,
    });
    setEditingPost(post);
  };

  const handleEditPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditFormData((prev) => ({ ...prev, photoFile: file }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingPost) return;

    const payload = new FormData();
    payload.append('summary', editFormData.summary);
    payload.append('is_completed', String(editFormData.is_completed));
    if (editFormData.photoFile) {
      payload.append('image', editFormData.photoFile);
    }

    try {
      setEditSubmitting(true);
      setEditError(null);
      await updateLeaderboardPost(editingPost.id, payload);
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Failed to update post:', error);
      setEditError(error.message || 'Failed to update post. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePost = (postId) => {
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    const postId = deletePostId;
    setDeletePostId(null);
    try {
      await deleteLeaderboardPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert(error.message || 'Failed to delete post. Please try again.');
    }
  };

  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_260px] lg:items-start">
        <div className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:space-y-5 lg:overflow-y-auto lg:pr-1">
          <Sidebar leaders={leaders} loading={leadersLoading} />
          <DailyLeaderboard leaders={dailyLeaders} loading={dailyLeadersLoading} />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <span className="text-base leading-none">+</span> Add Post
            </button>
            <button
              type="button"
              onClick={() => setShowChallengeComposer(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="text-base leading-none">+</span> Add Challenge
            </button>
          </div>
          <Feed
            posts={posts}
            challenges={challenges}
            loading={postsLoading}
            currentUserId={currentUserId}
            onEdit={openEditPost}
            onDelete={handleDeletePost}
            postLikes={postLikes}
            onToggleLike={handleToggleLike}
            postComments={postComments}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            challengeLikes={challengeLikes}
            onToggleChallengeLike={handleToggleChallengeLike}
            challengeComments={challengeComments}
            onAddChallengeComment={handleAddChallengeComment}
            onEditChallengeComment={handleEditChallengeComment}
            onDeleteChallengeComment={handleDeleteChallengeComment}
          />
        </div>

        <div className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <RightSidebar challenges={challenges.map((c) => c.name)} />
        </div>
      </div>

      {showComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setShowComposer(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Share your progress</h2>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                aria-label="Close"
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {postError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{postError}</p>
            )}

            <div className="grid gap-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Summary</span>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                  placeholder="Had a great workout today! 💪🔥"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-600 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_completed}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_completed: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm text-slate-600">Mark as completed</span>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={posting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {posting ? 'Posting…' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showChallengeComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setShowChallengeComposer(false)}
        >
          <form
            onSubmit={handleAddChallenge}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Add a challenge</h2>
              <button
                type="button"
                onClick={() => setShowChallengeComposer(false)}
                aria-label="Close"
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {challengeError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{challengeError}</p>
            )}

            <div className="grid gap-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Challenge name</span>
                <input
                  value={challengeFormData.name}
                  onChange={handleChallengeFieldChange('name')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="10K Steps Challenge"
                  autoFocus
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Description</span>
                <textarea
                  value={challengeFormData.description}
                  onChange={handleChallengeFieldChange('description')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                  placeholder="Walk 10,000 steps every day for one week!"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Goal</span>
                  <input
                    type="number"
                    value={challengeFormData.goal}
                    onChange={handleChallengeFieldChange('goal')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="10000"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Steps</span>
                  <input
                    type="number"
                    value={challengeFormData.steps}
                    onChange={handleChallengeFieldChange('steps')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="10000"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Distance (km)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={challengeFormData.distance}
                    onChange={handleChallengeFieldChange('distance')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="7.5"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Calories</span>
                  <input
                    type="number"
                    value={challengeFormData.calories}
                    onChange={handleChallengeFieldChange('calories')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="500"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Start date</span>
                  <input
                    type="date"
                    value={challengeFormData.start_date}
                    onChange={handleChallengeFieldChange('start_date')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">End date</span>
                  <input
                    type="date"
                    value={challengeFormData.end_date}
                    onChange={handleChallengeFieldChange('end_date')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChallengeImageChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-600 focus:border-blue-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={challengeSubmitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {challengeSubmitting ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowChallengeComposer(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setEditingPost(null)}
        >
          <form
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Edit post</h2>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                aria-label="Close"
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {editError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>
            )}

            <div className="grid gap-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Summary</span>
                <textarea
                  value={editFormData.summary}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                  placeholder="Share an update..."
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-600 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editFormData.is_completed}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, is_completed: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm text-slate-600">Mark as completed</span>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={editSubmitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {editSubmitting ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deletePostId != null}
        title="Delete post?"
        message="This cannot be undone."
        onConfirm={confirmDeletePost}
        onCancel={() => setDeletePostId(null)}
      />
    </div>
  );
}