// ============================================================
// Utility Helpers
// Mercedes-Benz Club Indonesia
// ============================================================

import type { MemberStatus } from '../types/database.types';

/**
 * Format date to Indonesian locale
 * e.g. "9 September 2024"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format date-time to Indonesian locale
 * e.g. "9 Sep 2024, 14:30"
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency to Indonesian Rupiah
 * e.g. "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get member status color for StatusBadge
 */
export function getStatusColor(status: MemberStatus): string {
  const map: Record<MemberStatus, string> = {
    active: '#22C55E',
    pending: '#F59E0B',
    suspended: '#EF4444',
    inactive: '#6B7280',
  };
  return map[status] ?? '#6B7280';
}

/**
 * Get member status label in Indonesian
 */
export function getStatusLabel(status: MemberStatus): string {
  const map: Record<MemberStatus, string> = {
    active: 'Aktif',
    pending: 'Menunggu',
    suspended: 'Dibekukan',
    inactive: 'Tidak Aktif',
  };
  return map[status] ?? status;
}

/**
 * Generate QR Code data string for KTA (Kartu Tanda Anggota)
 */
export function generateKTAQRData(params: {
  memberNumber: string;
  fullName: string;
  status: MemberStatus;
}): string {
  return JSON.stringify({
    type: 'MBCI_KTA',
    memberNumber: params.memberNumber,
    name: params.fullName,
    status: params.status,
    verified: true,
    ts: Date.now(),
  });
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format chapter name
 */
export function formatChapter(chapter: string | null): string {
  if (!chapter) return 'Pusat';
  return `Chapter ${chapter}`;
}

/**
 * Get initials from full name
 * e.g. "Budi Santoso" → "BS"
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Calculate days until expiry
 */
export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}
