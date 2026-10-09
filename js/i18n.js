// النصوص بالعربي (المصري زي باقي برامج Meta Origin) والإنجليزي. t(key, {param}) — المفتاح نفسه لو مش موجود.
let current = 'ar';
export const lang = () => current;
export const setLang = (l) => { current = l === 'en' ? 'en' : 'ar'; };
export function t(key, params) {
  let s = (current === 'ar' ? AR : EN)[key] ?? AR[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const AR = {
  appName: 'مدير التراخيص',
  otherLang: 'English',
  close: 'إغلاق',
  copied: '✓ اتنسخ',

  'welcome.sub': 'إصدار تراخيص برامج Meta Origin من الموبايل',
  'welcome.title': 'اربط الموبايل بمدير التراخيص',
  'welcome.s1': 'على الكمبيوتر: افتح مدير التراخيص ← «الموبايل» ← شغّل المزامنة ودوس «ربط موبايل».',
  'welcome.s2': 'الموبايل والكمبيوتر على نفس الشبكة (الواي فاي).',
  'welcome.s3': 'امسح الـ QR اللي ظهر على الكمبيوتر.',
  'welcome.scan': 'امسح QR الربط',
  'welcome.manual': 'مافيش كاميرا؟ اكتب البيانات بإيدك',
  'welcome.manualIp': 'عنوان الكمبيوتر (IP)',
  'welcome.manualCode': 'كود الربط (تحت الـ QR)',
  'welcome.manualGo': 'كمّل',
  'welcome.manualMissing': 'اكتب العنوان والكود',
  'welcome.note': 'المفاتيح بتيجي من الكمبيوتر متشفّرة بكلمة سر الإصدار، ومابتتفتحش غير بيها. التطبيق بيشتغل من غير نت بعد أول مرة.',

  'pair.found': 'لقينا مدير التراخيص على {pc}',
  'pair.certIntro': 'أول مرة بس: ثبّت شهادة مدير التراخيص على الموبايل (افتح الرابط وامشي على الخطوات)، وبعدين ارجع هنا ودوس «ربط».',
  'pair.certLink': 'شهادة مدير التراخيص',
  'pair.deviceName': 'اسم الموبايل ده (بيظهر في مدير التراخيص)',
  'pair.go': 'ربط',
  'pair.rescan': 'امسح QR تاني',
  'pair.working': 'جاري الربط…',

  'login.user': 'المستخدم',
  'login.password': 'كلمة السر',
  'login.go': 'دخول',
  'login.checking': 'جاري التأكد…',
  'login.wrong': 'كلمة السر غلط.',

  'tab.new': 'ترخيص جديد',
  'tab.list': 'التراخيص',
  'tab.sync': 'المزامنة',
  'tab.more': 'المزيد',

  'new.pick': 'اختار البرنامج',
  'new.pickHint': 'البرامج اللي ليها مفتاح وأرقام جاهزة على الموبايل.',
  'new.network': 'شبكة',
  'new.noKey': 'المفتاح مش جاهز',
  'new.noSerials': 'محتاج مزامنة',
  'new.noKeyLong': 'مفتاح البرنامج ده لسه على الكمبيوتر بس — من مدير التراخيص ← الموبايل ← «جهّز المفاتيح للموبايل»، وبعدين اعمل مزامنة.',
  'new.noSerialsLong': 'خلصت أرقام التراخيص اللي على الموبايل للبرنامج ده — اعمل مزامنة مع الكمبيوتر.',
  'new.serialsLeft': 'باقي {n} رقم',
  'new.change': 'تغيير',
  'new.type': 'نوع الترخيص',
  'type.Server': 'الجهاز الرئيسي',
  'type.Client': 'الأجهزة التانية',
  'new.serverHint': 'للجهاز الرئيسي (أو الجهاز الوحيد).',
  'new.clientHint': 'لعدد من الأجهزة التانية — بيتعمل على كود الجهاز الرئيسي.',
  'new.customer': 'اسم العميل',
  'new.customerPh': 'اسم المحل / الشركة',
  'new.contact': 'رقم العميل (اختياري)',
  'new.machine': 'كود الجهاز',
  'new.machineClient': 'كود الجهاز الرئيسي',
  'new.camera': 'الكاميرا',
  'new.machineOk': 'الكود سليم',
  'new.machineBad': 'الكود ناقص أو فيه حرف غلط',
  'new.machineHint': 'اكتبه أو دوس 📷 وصوّر الـ QR أو الكود نفسه.',
  'new.seats': 'عدد الأجهزة',
  'new.modules': 'الحزم اللي الترخيص بيفتحها',
  'new.duration': 'المدة',
  'new.endDate': 'آخر يوم',
  'new.validUntil': 'صالح لحد {date}',
  'new.lifetime': 'مدى الحياة',
  'new.notes': 'ملاحظات (اختياري)',
  'new.genPassword': 'كلمة سر الإصدار',
  'new.remember': 'افتكرها لحد ما أقفل التطبيق',
  'new.issue': 'طلّع الترخيص',
  'new.working': 'جاري الإصدار…',
  'new.err.customer': 'اكتب اسم العميل.',
  'new.err.machine': 'كود الجهاز مش صحيح.',
  'new.err.seats': 'اكتب عدد الأجهزة.',
  'new.err.duration': 'اختار المدة.',
  'new.err.date': 'اختار تاريخ صحيح.',
  'new.err.modules': 'اختار حزمة واحدة على الأقل.',
  'new.err.genPassword': 'كلمة سر الإصدار غلط.',
  'new.err.keyMismatch': 'المفتاح مش مطابق للبرنامج — اعمل مزامنة.',
  'new.err.unexpected': 'حصل خطأ — جرّب تاني.',

  'dur.1m': 'شهر', 'dur.2m': 'شهرين', 'dur.3m': '3 شهور', 'dur.6m': '6 شهور', 'dur.1y': 'سنة', 'dur.2y': 'سنتين', 'dur.life': 'مدى الحياة', 'dur.custom': 'تاريخ معيّن',

  'result.done': 'الترخيص طلع',
  'result.copy': 'نسخ',
  'result.share': 'مشاركة',
  'result.whatsapp': 'واتساب',
  'result.renew': 'تجديد',
  'share.text': 'ترخيص {program}\nالعميل: {customer}\nصالح لحد: {until}\n\n{key}',

  'f.machine': 'كود الجهاز', 'f.serial': 'الرقم', 'f.seats': 'الأجهزة', 'f.modules': 'الحزم', 'f.until': 'لحد', 'f.issued': 'اتعمل',
  'f.by': 'بواسطة', 'f.contact': 'الرقم', 'f.notes': 'ملاحظات', 'f.refused': 'الكمبيوتر رفضه',
  'refused.signature': 'التوقيع مش مطابق', 'refused.serial': 'الرقم مش من أرقام الموبايل ده', 'refused.duplicate': 'الرقم ده مستخدم', 'refused.program': 'البرنامج مش موجود',

  'st.life': 'مدى الحياة', 'st.expired': 'خلص', 'st.left': 'باقي {n} يوم',
  'list.search': 'دوّر باسم العميل أو الرقم أو كود الجهاز',
  'list.pending': 'مستني مزامنة', 'list.refused': 'مرفوض', 'list.renewed': 'اتجدّد', 'list.empty': 'مافيش تراخيص.',

  'sync.ok': 'متزامن',
  'sync.done': 'المزامنة تمت ({n} ترخيص اتبعت)',
  'sync.someRefused': 'الكمبيوتر رفض {n} ترخيص — شوف «المزامنة»',
  'sync.addresses': 'العنوان', 'sync.last': 'آخر مزامنة', 'sync.pending': 'مستني يتبعت', 'sync.state': 'الحالة',
  'sync.now': 'مزامنة دلوقتي',
  'sync.hint': 'المزامنة بتحصل لوحدها لما الموبايل يبقى على نفس شبكة الكمبيوتر ومدير التراخيص مفتوح.',
  'sync.refusedTitle': 'تراخيص الكمبيوتر رفضها',
  'sync.certTitle': 'شهادة مدير التراخيص',
  'sync.certHint': 'لو المزامنة مش شغالة وانت على نفس الشبكة: اتأكد إن الشهادة متثبّتة على الموبايل.',
  'sync.serials': 'أرقام التراخيص على الموبايل',
  'sync.serialRange': 'من {from} لحد {to}',
  'sync.unpair': 'فك الربط ومسح البيانات من الموبايل',
  'sync.unpairPending': 'فيه {n} ترخيص لسه ما اتبعتش للكمبيوتر وهيضيع. متأكد؟',
  'sync.unpairConfirm': 'هيتمسح كل اللي على الموبايل (المفاتيح والتراخيص). متأكد؟',
  'sync.err.notPaired': 'الموبايل مش مربوط.',
  'sync.err.unreachable': 'مش لاقيين الكمبيوتر — اتأكد إنكم على نفس الواي فاي، ومدير التراخيص مفتوح والمزامنة شغالة، والشهادة متثبّتة.',
  'sync.err.pairExpired': 'كود الربط خلص — دوس «ربط موبايل» تاني على الكمبيوتر.',
  'sync.err.pairCode': 'كود الربط غلط.',
  'sync.err.unpaired': 'الموبايل ده اتشال من مدير التراخيص — اربطه تاني.',
  'sync.err.notReady': 'مدير التراخيص لسه مش جاهز.',
  'sync.err.badRequest': 'طلب غلط.',
  'sync.err.unexpected': 'حصل خطأ في المزامنة',

  'more.help': 'شرح البرنامج',
  'more.about': 'حول البرنامج',
  'more.forgetGen': 'انسى كلمة سر الإصدار',
  'more.forgotten': 'هتتسأل عنها تاني المرة الجاية',
  'more.logout': 'خروج',

  'about.mahmoud': 'محمود يوسف',
  'about.mahmoudRole': 'المؤسس والمدير التنفيذي',
  'about.omar': 'عمر صالح',
  'about.omarRole': 'الشريك المؤسس',

  'scan.codeTitle': 'صوّر كود الجهاز',
  'scan.pairTitle': 'امسح QR الربط',
  'scan.pointCode': 'وجّه الكاميرا على الـ QR أو على الكود المكتوب جوّه المربع',
  'scan.pointPair': 'وجّه الكاميرا على الـ QR اللي على شاشة الكمبيوتر',
  'scan.readText': 'اقرا الكود المكتوب',
  'scan.picture': 'من صورة',
  'scan.reading': 'بقرا…',
  'scan.hintQr': 'لو مش بيقرا: قرّب الكود جوّه المربع وثبّت الموبايل، أو صوّر الـ QR.',
  'scan.notRead': 'ماقدرتش أقرا كود سليم — قرّب وجرّب تاني.',
  'scan.ocrFailed': 'قراية الكلام مش متاحة — اكتب الكود بإيدك.',
  'scan.notInPicture': 'مالقيتش كود سليم في الصورة.',
  'scan.noCamera': 'مش قادرين نفتح الكاميرا — اسمح للتطبيق باستخدامها من الإعدادات.',
  'scan.needHttps': 'الكاميرا محتاجة التطبيق يتفتح من رابط https.',
  'scan.notPairQr': 'ده مش QR الربط بتاع مدير التراخيص.',
  'scan.notCodeQr': 'الـ QR ده مش كود جهاز.',

  'help.html': `
    <h3>إزاي تطلّع ترخيص</h3>
    <ol class="steps">
      <li>«ترخيص جديد» ← اختار البرنامج.</li>
      <li>اكتب اسم العميل، ودوس 📷 وصوّر الـ QR اللي في شاشة التفعيل عند العميل (أو الكود المكتوب، أو صورة بعتهالك واتساب).</li>
      <li>اختار المدة (وعدد الأجهزة لترخيص الأجهزة التانية) ودوس «طلّع الترخيص» واكتب كلمة سر الإصدار.</li>
      <li>ابعت الترخيص للعميل: «واتساب» أو «مشاركة» أو «نسخ».</li>
    </ol>
    <h3>من غير نت</h3><p>الإصدار بيشتغل من غير نت ومن غير الكمبيوتر. الكمبيوتر بيدّي الموبايل مجموعة أرقام لكل برنامج، ولما تخلص اعمل مزامنة.</p>
    <h3>المزامنة</h3><p>لما الموبايل يبقى على نفس شبكة الكمبيوتر ومدير التراخيص مفتوح، التراخيص اللي طلعت من الموبايل بتتسجل عنده (بعد ما يتأكد منها)، والعملاء والتراخيص الجديدة بتنزل على الموبايل.</p>
    <h3>الأمان</h3><p>مفاتيح التوقيع متشفّرة بكلمة سر الإصدار ومابتتفتحش غير بيها. التطبيق بيقفل لوحده بعد 10 دقايق في الخلفية. لو الموبايل ضاع: من مدير التراخيص ← الموبايل ← «إيقاف» الموبايل ده، وغيّر كلمة سر الإصدار.</p>`,
};

const EN = {
  appName: 'License Manager',
  otherLang: 'عربي',
  close: 'Close',
  copied: '✓ Copied',

  'welcome.sub': 'Issue Meta Origin licenses from your phone',
  'welcome.title': 'Link the phone to the License Manager',
  'welcome.s1': 'On the PC: open the License Manager → "Phone" → turn sync on and press "Pair a phone".',
  'welcome.s2': 'The phone and the PC on the same network (Wi-Fi).',
  'welcome.s3': 'Scan the QR shown on the PC.',
  'welcome.scan': 'Scan the pairing QR',
  'welcome.manual': 'No camera? Type the details',
  'welcome.manualIp': 'PC address (IP)',
  'welcome.manualCode': 'Pairing code (under the QR)',
  'welcome.manualGo': 'Continue',
  'welcome.manualMissing': 'Type the address and the code',
  'welcome.note': 'The keys come from the PC sealed with the generation password and only open with it. The app works offline after the first time.',

  'pair.found': 'License Manager found on {pc}',
  'pair.certIntro': 'First time only: install the License Manager certificate on this phone (open the link and follow the steps), then come back and press "Pair".',
  'pair.certLink': 'License Manager certificate',
  'pair.deviceName': 'This phone\'s name (shown in the License Manager)',
  'pair.go': 'Pair',
  'pair.rescan': 'Scan again',
  'pair.working': 'Pairing…',

  'login.user': 'User', 'login.password': 'Password', 'login.go': 'Sign in', 'login.checking': 'Checking…', 'login.wrong': 'Wrong password.',
  'tab.new': 'New license', 'tab.list': 'Licenses', 'tab.sync': 'Sync', 'tab.more': 'More',

  'new.pick': 'Choose the program',
  'new.pickHint': 'Programs with a key and serial numbers on this phone.',
  'new.network': 'network',
  'new.noKey': 'Key not ready',
  'new.noSerials': 'Needs a sync',
  'new.noKeyLong': 'This program\'s key is still only on the PC — License Manager → Phone → "Prepare keys for the phone", then sync.',
  'new.noSerialsLong': 'This phone has no license numbers left for this program — sync with the PC.',
  'new.serialsLeft': '{n} numbers left',
  'new.change': 'Change',
  'new.type': 'License type',
  'type.Server': 'Main computer',
  'type.Client': 'Other computers',
  'new.serverHint': 'For the main computer (or the only one).',
  'new.clientHint': 'For a number of other computers — issued for the main computer\'s code.',
  'new.customer': 'Customer name', 'new.customerPh': 'Shop / company name', 'new.contact': 'Customer phone (optional)',
  'new.machine': 'Machine code', 'new.machineClient': 'Main computer\'s machine code', 'new.camera': 'Camera',
  'new.machineOk': 'Valid code', 'new.machineBad': 'Incomplete or mistyped code', 'new.machineHint': 'Type it or press 📷 to photograph the QR or the code.',
  'new.seats': 'Number of computers', 'new.modules': 'Packages the license opens', 'new.duration': 'Duration', 'new.endDate': 'Last day',
  'new.validUntil': 'Valid until {date}', 'new.lifetime': 'Lifetime', 'new.notes': 'Notes (optional)',
  'new.genPassword': 'Generation password', 'new.remember': 'Remember it until the app closes',
  'new.issue': 'Issue the license', 'new.working': 'Issuing…',
  'new.err.customer': 'Type the customer\'s name.', 'new.err.machine': 'The machine code is not valid.', 'new.err.seats': 'Type the number of computers.',
  'new.err.duration': 'Choose the duration.', 'new.err.date': 'Choose a valid date.', 'new.err.modules': 'Choose at least one package.',
  'new.err.genPassword': 'Wrong generation password.', 'new.err.keyMismatch': 'The key does not match the program — sync.', 'new.err.unexpected': 'Something went wrong — try again.',

  'dur.1m': '1 month', 'dur.2m': '2 months', 'dur.3m': '3 months', 'dur.6m': '6 months', 'dur.1y': '1 year', 'dur.2y': '2 years', 'dur.life': 'Lifetime', 'dur.custom': 'Until a date',

  'result.done': 'License issued', 'result.copy': 'Copy', 'result.share': 'Share', 'result.whatsapp': 'WhatsApp', 'result.renew': 'Renew',
  'share.text': '{program} license\nCustomer: {customer}\nValid until: {until}\n\n{key}',
  'f.machine': 'Machine code', 'f.serial': 'Number', 'f.seats': 'Computers', 'f.modules': 'Packages', 'f.until': 'Until', 'f.issued': 'Issued',
  'f.by': 'By', 'f.contact': 'Phone', 'f.notes': 'Notes', 'f.refused': 'Refused by the PC',
  'refused.signature': 'signature does not match', 'refused.serial': 'not one of this phone\'s numbers', 'refused.duplicate': 'number already used', 'refused.program': 'unknown program',
  'st.life': 'Lifetime', 'st.expired': 'Expired', 'st.left': '{n} days left',
  'list.search': 'Search by customer, number or machine code', 'list.pending': 'Waiting for sync', 'list.refused': 'Refused', 'list.renewed': 'Renewed', 'list.empty': 'No licenses.',

  'sync.ok': 'In sync', 'sync.done': 'Synced ({n} licenses sent)', 'sync.someRefused': 'The PC refused {n} licenses — see "Sync"',
  'sync.addresses': 'Address', 'sync.last': 'Last sync', 'sync.pending': 'Waiting to send', 'sync.state': 'Status', 'sync.now': 'Sync now',
  'sync.hint': 'Sync happens by itself when the phone is on the PC\'s network and the License Manager is open.',
  'sync.refusedTitle': 'Licenses the PC refused', 'sync.certTitle': 'License Manager certificate',
  'sync.certHint': 'If sync fails on the same network, make sure the certificate is installed on this phone.',
  'sync.serials': 'License numbers on this phone', 'sync.serialRange': 'from {from} to {to}',
  'sync.unpair': 'Unpair and erase this phone\'s data',
  'sync.unpairPending': '{n} licenses were not sent to the PC yet and will be lost. Sure?',
  'sync.unpairConfirm': 'Everything on this phone (keys and licenses) will be erased. Sure?',
  'sync.err.notPaired': 'This phone is not paired.',
  'sync.err.unreachable': 'The PC cannot be reached — same Wi-Fi? License Manager open with sync on? Certificate installed?',
  'sync.err.pairExpired': 'The pairing code expired — press "Pair a phone" again on the PC.',
  'sync.err.pairCode': 'Wrong pairing code.',
  'sync.err.unpaired': 'This phone was removed in the License Manager — pair it again.',
  'sync.err.notReady': 'The License Manager is not ready yet.',
  'sync.err.badRequest': 'Bad request.',
  'sync.err.unexpected': 'Sync failed',

  'more.help': 'Help', 'more.about': 'About', 'more.forgetGen': 'Forget the generation password', 'more.forgotten': 'You will be asked again next time', 'more.logout': 'Sign out',
  'about.mahmoud': 'Mahmoud Youssef', 'about.mahmoudRole': 'Founder & CEO', 'about.omar': 'Omar Saleh', 'about.omarRole': 'Co-founder',

  'scan.codeTitle': 'Photograph the machine code', 'scan.pairTitle': 'Scan the pairing QR',
  'scan.pointCode': 'Point at the QR, or at the printed code inside the box', 'scan.pointPair': 'Point at the QR on the PC screen',
  'scan.readText': 'Read the printed code', 'scan.picture': 'From a picture', 'scan.reading': 'Reading…',
  'scan.hintQr': 'Not reading? Bring the code inside the box and hold still, or scan the QR.',
  'scan.notRead': 'No valid code read — come closer and try again.', 'scan.ocrFailed': 'Text reading is not available — type the code.',
  'scan.notInPicture': 'No valid code in the picture.', 'scan.noCamera': 'The camera cannot be opened — allow it in the settings.',
  'scan.needHttps': 'The camera needs the app opened from an https link.', 'scan.notPairQr': 'This is not the License Manager pairing QR.',
  'scan.notCodeQr': 'This QR is not a machine code.',

  'help.html': `
    <h3>Issuing a license</h3>
    <ol class="steps">
      <li>"New license" → choose the program.</li>
      <li>Type the customer's name and press 📷 to photograph the QR on the customer's activation screen (or the printed code, or a picture sent on WhatsApp).</li>
      <li>Choose the duration (and the number of computers for a client license), press "Issue the license" and type the generation password.</li>
      <li>Send it: "WhatsApp", "Share" or "Copy".</li>
    </ol>
    <h3>Offline</h3><p>Issuing works without internet and without the PC: the PC gives this phone a block of numbers per program; sync when they run out.</p>
    <h3>Sync</h3><p>On the PC's network with the License Manager open, licenses issued here are recorded there (after being checked) and new customers and licenses come down.</p>
    <h3>Security</h3><p>The signing keys are sealed with the generation password. The app locks itself after 10 minutes in the background. Lost phone: License Manager → Phone → "Stop" this phone, and change the generation password.</p>`,
};
