/**
 * Delta Detector
 * كشف التغييرات عبر Hash comparison
 * 
 * Phase 5: Delta Detection + Queue
 * لا يرسل البيانات إلا عند التغيير
 */

class DeltaDetector {
    constructor() {
        this.storageKey = 'moodle_data_hashes';
    }

    /**
     * هل تغيرت البيانات منذ آخر مزامنة؟
     */
    async hasChanged(data) {
        const currentHash = await this.computeHash(data);
        const lastHash = await this._getLastHash();

        if (!lastHash) {
            console.log('[Delta] No previous hash found - first sync');
            return true;
        }

        const changed = currentHash !== lastHash;
        console.log(`[Delta] Changed: ${changed} (current: ${currentHash.substring(0, 8)}... last: ${lastHash.substring(0, 8)}...)`);
        return changed;
    }

    /**
     * هل تغيرت بيانات دورة معينة؟
     */
    async hasCourseChanged(courseId, courseData) {
        const currentHash = await this.computeHash(courseData);
        const hashes = await this._getAllHashes();
        const lastHash = hashes[`course_${courseId}`];

        return currentHash !== lastHash;
    }

    /**
     * حفظ hash البيانات الحالية
     */
    async saveHash(data) {
        const hash = await this.computeHash(data);

        return new Promise(resolve => {
            chrome.storage.local.get([this.storageKey], result => {
                const hashes = result[this.storageKey] || {};
                hashes['_global'] = hash;
                hashes['_timestamp'] = new Date().toISOString();

                chrome.storage.local.set({ [this.storageKey]: hashes }, resolve);
            });
        });
    }

    /**
     * حفظ hash لدورة معينة
     */
    async saveCourseHash(courseId, courseData) {
        const hash = await this.computeHash(courseData);

        return new Promise(resolve => {
            chrome.storage.local.get([this.storageKey], result => {
                const hashes = result[this.storageKey] || {};
                hashes[`course_${courseId}`] = hash;

                chrome.storage.local.set({ [this.storageKey]: hashes }, resolve);
            });
        });
    }

    /**
     * حساب Hash للبيانات
     * يستخدم SHA-256 عبر Web Crypto API
     */
    async computeHash(data) {
        // Normalize data: sort keys, remove volatile fields
        const normalized = this._normalizeForHash(data);
        const text = JSON.stringify(normalized);

        try {
            // Use Web Crypto API (available in service workers)
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
            // Fallback: simple hash function
            return this._simpleHash(text);
        }
    }

    /**
     * تطبيع البيانات قبل الهاشينغ (إزالة الحقول المتغيرة)
     */
    _normalizeForHash(data) {
        if (!data) return data;

        const clone = JSON.parse(JSON.stringify(data));

        // Remove volatile fields that change every sync
        delete clone.synced_at;
        delete clone.extractedAt;
        delete clone.timestamp;

        // Sort arrays for consistent hashing
        if (clone.courses) {
            clone.courses.sort((a, b) => (a.course_id || '').localeCompare(b.course_id || ''));
        }
        if (clone.assignments) {
            clone.assignments.sort((a, b) => (a.assignment_id || '').localeCompare(b.assignment_id || ''));
        }
        if (clone.grades) {
            clone.grades.sort((a, b) => {
                const k1 = `${a.course_id}_${a.item_name}`;
                const k2 = `${b.course_id}_${b.item_name}`;
                return k1.localeCompare(k2);
            });
        }

        return clone;
    }

    /**
     * Simple hash fallback (djb2 algorithm)
     */
    _simpleHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * الحصول على آخر hash عام
     */
    async _getLastHash() {
        const hashes = await this._getAllHashes();
        return hashes['_global'] || null;
    }

    /**
     * الحصول على كل الـ hashes المخزنة
     */
    async _getAllHashes() {
        return new Promise(resolve => {
            chrome.storage.local.get([this.storageKey], result => {
                resolve(result[this.storageKey] || {});
            });
        });
    }

    /**
     * مسح كل الـ hashes (يفرض مزامنة كاملة)
     */
    async clearHashes() {
        return new Promise(resolve => {
            chrome.storage.local.remove([this.storageKey], resolve);
        });
    }

    /**
     * الحصول على معلومات عن آخر تغيير
     */
    async getLastChangeInfo() {
        const hashes = await this._getAllHashes();
        return {
            lastHash: hashes['_global'] || null,
            lastTimestamp: hashes['_timestamp'] || null,
            courseHashes: Object.keys(hashes)
                .filter(k => k.startsWith('course_'))
                .reduce((acc, k) => {
                    acc[k.replace('course_', '')] = hashes[k];
                    return acc;
                }, {})
        };
    }
}

// Export
if (typeof self !== 'undefined') {
    self.DeltaDetector = DeltaDetector;
}
if (typeof window !== 'undefined') {
    window.DeltaDetector = DeltaDetector;
}
