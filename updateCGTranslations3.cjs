const fs = require("fs");
const path = "src/questionBank.js";
const raw = fs.readFileSync(path, "utf8");
const match = raw.match(/export const Q_UNIFIED = (\[[\s\S]*?\n\])/);
if (!match) throw new Error("Q_UNIFIED array not found");
const arr = JSON.parse(match[1]);
const updates = {
  41: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "في مهرجان مدرسي مزدحم، تتطوع مع فريق السلامة؛ تتنقل بين الأجنحة وتحافظ على الممرات مفتوحة. ما مدى استمتاعك بذلك؟",
    textFR: "Lors d'une foire scolaire très fréquentée, tu fais du bénévolat avec l'équipe de sécurité, tu circules entre les stands et gardes les passages dégagés. À quel point apprécierais-tu cela ?",
  },
  42: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "أثناء تمرين السلامة، ترشد الطلاب الأصغر على مسارات الإخلاء وتبلغ أن منطقتك خالية. ما مدى استمتاعك بذلك؟",
    textFR: "Pendant un exercice de sécurité, tu guides les plus jeunes sur les itinéraires d'évacuation et signales que ta zone est dégagée. À quel point apprécierais-tu cela ?",
  },
  43: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "ترافق ضابط شرطة ليوم كامل وتراقب كيف يتعامل مع المجتمع. ما مدى استمتاعك بذلك؟",
    textFR: "Tu accompagnes un policier pendant une journée et observes la manière dont il interagit avec la communauté. À quel point apprécierais-tu cela ?",
  },
  44: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "تساعد فريق الاستجابة للطوارئ أثناء تمرين حريق، وتحافظ على هدوئك وتركيزك. ما مدى استمتاعك بذلك؟",
    textFR: "Tu prêtes main-forte à une équipe d'intervention d'urgence lors d'un exercice d'incendie, en restant calme et concentré. À quel point apprécierais-tu cela ?",
  },
  45: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "تتدرب مع مجموعة على استخدام أجهزة الاتصال اللاسلكي وتنسيق ضبط الحشود في الفعاليات. ما مدى استمتاعك بذلك؟",
    textFR: "Tu t'entraînes avec un groupe à utiliser des talkies-walkies et à coordonner la gestion de la foule pendant les événements. À quel point apprécierais-tu cela ?",
  },
  46: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "تشارك في مراقبة الحي، تسجل أي نشاط غير معتاد وتشارك التقارير بمسؤولية. ما مدى استمتاعك بذلك؟",
    textFR: "Tu participes à une surveillance de quartier, notes les activités inhabituelles et partages les rapports de façon responsable. À quel point apprécierais-tu cela ?",
  },
  47: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "تنضم إلى جلسة تدريب للإنقاذ البحري، تتعلم كيفية مسح الماء والتعرف على علامات الخطر. ما مدى استمتاعك بذلك؟",
    textFR: "Tu suis une session de formation de sauveteur, apprends à balayer le plan d'eau du regard et à repérer les signes de détresse. À quel point apprécierais-tu cela ?",
  },
  48: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "عند مدخل فعالية، تساعد في التحقق من الهويات والتأكد من دخول الضيوف المسجلين فقط. ما مدى استمتاعك بذلك؟",
    textFR: "À l'entrée d'un événement, tu aides à vérifier les pièces d'identité et t'assures que seuls les invités inscrits entrent. À quel point apprécierais-tu cela ?",
  },
  49: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "تساعد في رسم خرائط الإخلاء للصفوف وتجربة المسارات أثناء التدريبات. ما مدى استمتاعك بذلك؟",
    textFR: "Tu aides à dessiner des plans d'évacuation pour les salles de classe et testes les itinéraires lors des exercices. À quel point apprécierais-tu cela ?",
  },
  50: {
    areaAR: "خدمات الحماية",
    areaFR: "Services de protection",
    textAR: "في اليوم المفتوح لمحطة الإطفاء، تعرض معدات السلامة للأطفال وتجيب عن أسئلتهم. ما مدى استمتاعك بذلك؟",
    textFR: "Lors d'une journée portes ouvertes à la caserne, tu présentes le matériel de sécurité aux enfants et réponds à leurs questions. À quel point apprécierais-tu cela ?",
  },
  51: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تنقطع سلسلة دراجة جارك؛ على الشرفة تشخّص المشكلة، تصلحها، وتجرب الدراجة في الشارع. ما مدى استمتاعك بذلك؟",
    textFR: "La chaîne du vélo de ton voisin casse ; sur le porche, tu diagnostiques le problème, la répares et testes le vélo dans la rue. À quel point apprécierais-tu cela ?",
  },
  52: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "صديقك يبني مخزناً خشبياً؛ مع شريط القياس على خصرك، تحدد مواضع القص، تنشر الألواح، وتثبت الإطار بدقة. ما مدى استمتاعك بذلك؟",
    textFR: "Un ami construit un cabanon ; mètre à la ceinture, tu marques les coupes, scies les planches et cloues l'ossature bien d'équerre. À quel point apprécierais-tu cela ?",
  },
  53: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تعيد طلاء وترميم مكاتب قديمة للصف، تصقل الحواف الخشنة وتضع طبقة نهائية نظيفة. ما مدى استمتاعك بذلك؟",
    textFR: "Tu repeins et restaures de vieux pupitres pour la classe, ponces les arêtes rugueuses et appliques une finition nette. À quel point apprécierais-tu cela ?",
  },
  54: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "في ورشة نجارة، تصمم وتبني صندوقاً خشبياً صغيراً بتوصيلات محكمة. ما مدى استمتاعك بذلك؟",
    textFR: "Dans un atelier de menuiserie, tu conçois et construis une petite boîte en bois aux assemblages précis. À quel point apprécierais-tu cela ?",
  },
  55: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تقضي اليوم تساعد سباكاً على استبدال أنابيب متسربة أسفل المغسلة وتجرب الإحكام. ما مدى استمتاعك بذلك؟",
    textFR: "Tu passes la journée à aider un plombier à remplacer des tuyaux qui fuient sous un évier et testes l'étanchéité. À quel point apprécierais-tu cela ?",
  },
  56: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "خلال جولة ميدانية بإشراف، تلاحظ العمال وهم يرفعون الجدران ويثبتون العوارض في مبنى جديد. ما مدى استمتاعك بذلك؟",
    textFR: "Lors d'une visite de chantier guidée, tu observes les ouvriers qui montent les murs et posent les poutres d'un nouveau bâtiment. À quel point apprécierais-tu cela ?",
  },
  57: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تفكك راديو قديماً لتعرف كيف صُمم، ثم تعيد تركيبه ليعمل من جديد. ما مدى استمتاعك بذلك؟",
    textFR: "Tu démontes un vieux poste radio pour découvrir comment il est construit, puis le remontes pour qu'il fonctionne de nouveau. À quel point apprécierais-tu cela ?",
  },
  58: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تساعد في إصلاح سياج مكسور في الحي، توازن الألواح وتثبت المسامير بإحكام. ما مدى استمتاعك بذلك؟",
    textFR: "Tu aides à réparer une clôture cassée dans le quartier, réalignes les planches et enfonces les clous fermement. À quel point apprécierais-tu cela ?",
  },
  59: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "تتدرب تحت إشراف على استخدام الأدوات الكهربائية بأمان ودقة على قطع خشب احتياطية. ما مدى استمتاعك بذلك؟",
    textFR: "Sous supervision, tu t'exerces à utiliser des outils électriques en toute sécurité et avec précision sur des chutes de bois. À quel point apprécierais-tu cela ?",
  },
  60: {
    areaAR: "الميكانيكا والإنشاءات",
    areaFR: "Mécanique et construction",
    textAR: "ترسم مخططاً بسيطاً لبيت كلب وتبنيه من الخشب الخام حتى السقف النهائي. ما مدى استمتاعك بذلك؟",
    textFR: "Tu élabores un plan simple pour une niche et la construis du bois brut jusqu'au toit fini. À quel point apprécierais-tu cela ?",
  },
};
const updated = arr.map((q) => (updates[q.id] ? { ...q, ...updates[q.id] } : q));
const newArrayString = JSON.stringify(updated, null, 2);
const newContent = raw.replace(match[1], newArrayString);
fs.writeFileSync(path, newContent, "utf8");
console.log("Updated translations for IDs 41-60.");
