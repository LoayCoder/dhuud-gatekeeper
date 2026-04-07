
المشكلة واضحة من الكود الحالي:

- الشرط الذي يفتح/يغلق الـ Photo Gate هو:
  `!!worker.photo_path && !!worker.photo_verified_at`
- الصورة عندك موجودة فعلًا، لذلك المعاينة تظهر.
- لكن `photo_verified_at` غالبًا ما تزال `null`، لذلك النظام ما زال يعتبر العامل “غير موثّق الصورة”.

سبب ذلك في المسار الحالي:
- `WorkerPhotoGate` فقط هو الذي يستدعي `useVerifyWorkerPhoto` ويكتب:
  `photo_verified_at` + `photo_verified_by`
- أما رفع الصورة من نماذج التعديل/الإضافة العادية فيكتب `photo_path` فقط، بدون التوثيق.
- لذلك النتيجة الحالية هي: “الصورة موجودة” لكن “غير Verified”.

خطة الإصلاح:

1. توحيد منطق الصورة في جميع مسارات تحديث العامل
- تعديل مسارات تحديث `contractor_workers` بحيث عند حفظ صورة من واجهات الإدارة الموثوقة يتم أيضًا حفظ:
  - `photo_verified_at`
  - `photo_verified_by`
- وعند إزالة الصورة يتم تصفير حقول التوثيق أيضًا.
- أهم الملفات:
  - `src/features/contractors/hooks/use-update-contractor-worker.ts`
  - `src/features/contractors/hooks/use-sync-personnel-to-workers.ts`

2. إبقاء `useVerifyWorkerPhoto` للمسار المباشر داخل الـ gate
- لن أزيله، لكن لن يكون هو المسار الوحيد الذي يجعل العامل ينجح في شرط الصورة.
- بهذا تصبح كل من:
  - الرفع من شاشة التعديل
  - الرفع من شاشة الـ Photo Gate
  تعملان بنفس النتيجة المنطقية.

3. إصلاح مشكلة الـ stale data داخل الـ dialog
- `WorkerDetailDialog` يستقبل نسخة snapshot من العامل عبر `selectedWorker`.
- حتى بعد invalidation قد يبقى الـ dialog يعرض بيانات قديمة.
- سأحوّل الفتح ليعتمد على `selectedWorkerId` مع جلب أحدث سجل، أو تحديث الكاش محليًا، بدل الاعتماد على `window.location.reload()`.
- الملفات المتأثرة:
  - `src/features/contractors/components/WorkerDetailDialog.tsx`
  - `src/features/contractors/components/WorkerListTable.tsx`

4. إصلاح side-effect صغير في `WorkerPhotoUpload`
- يوجد استخدام غير صحيح لـ `useState(() => { ...fetchPhotoUrl })` بدل `useEffect`.
- سأصححه حتى تتحدث المعاينة بشكل صحيح عند تغير `photoPath`.
- الملف:
  - `src/features/contractors/components/WorkerPhotoUpload.tsx`

5. معالجة البيانات الحالية الموجودة بالفعل
- لأن عندك عمال لديهم `photo_path` موجود لكن `photo_verified_at` فارغ، سأضيف معالجة آمنة لبياناتهم الحالية.
- الهدف: أي عامل نشط لديه صورة بالفعل ولا يملك توثيق صورة، يتم استكمال حالة التوثيق له بدل أن يبقى عالقًا.
- لا يحتاج هذا لتغيير schema لأن الأعمدة موجودة أصلًا؛ فقط تحديث بيانات موجودة.

التحقق بعد التنفيذ:
- رفع صورة من تعديل العامل يجب أن يزيل رسالة “Photo Required”.
- رفع صورة من داخل الـ Photo Gate يجب أن ينجح بدون reload كامل.
- عامل قديم لديه صورة مسبقًا يجب أن يتوقف عن إظهار التحذير بعد معالجة البيانات.
- حذف الصورة أو استبدالها يجب أن يبقي حالة التوثيق متسقة.
