/**
 * Pre-populated common health issues for elder care
 * These are cached by the service worker for offline access
 * Users can select from these to quickly describe symptoms
 */

export interface CommonSymptom {
  id: string;
  category: SymptomCategory;
  title: string;
  description: string;
  keywords: string[]; // For search/filter
  urgencyHint: 'low' | 'moderate' | 'urgent' | 'emergency';
  relatedConditions?: string[];
}

export type SymptomCategory =
  | 'pain'
  | 'digestive'
  | 'respiratory'
  | 'cardiovascular'
  | 'neurological'
  | 'mobility'
  | 'skin'
  | 'mental_health'
  | 'sleep'
  | 'urinary'
  | 'vision_hearing'
  | 'general';

export const SYMPTOM_CATEGORIES: Record<SymptomCategory, { label: string; icon: string }> = {
  pain: { label: 'Pain & Discomfort', icon: 'Zap' },
  digestive: { label: 'Digestive Issues', icon: 'Apple' },
  respiratory: { label: 'Breathing & Respiratory', icon: 'Wind' },
  cardiovascular: { label: 'Heart & Circulation', icon: 'Heart' },
  neurological: { label: 'Neurological', icon: 'Brain' },
  mobility: { label: 'Mobility & Balance', icon: 'Footprints' },
  skin: { label: 'Skin & Wounds', icon: 'Hand' },
  mental_health: { label: 'Mental Health', icon: 'Smile' },
  sleep: { label: 'Sleep Issues', icon: 'Moon' },
  urinary: { label: 'Urinary & Kidney', icon: 'Droplet' },
  vision_hearing: { label: 'Vision & Hearing', icon: 'Eye' },
  general: { label: 'General Symptoms', icon: 'Thermometer' },
};

/**
 * 100 Common Elder Health Issues
 * Organized by category for easy browsing
 * Each includes a detailed description template
 */
export const COMMON_SYMPTOMS: CommonSymptom[] = [
  // ============================================
  // PAIN & DISCOMFORT (15 items)
  // ============================================
  {
    id: 'headache-tension',
    category: 'pain',
    title: 'Tension Headache',
    description: 'Dull, aching head pain that feels like a tight band around the head. May include tenderness in scalp, neck, and shoulder muscles.',
    keywords: ['headache', 'head pain', 'tension', 'pressure'],
    urgencyHint: 'low',
    relatedConditions: ['Stress', 'Poor posture', 'Eye strain'],
  },
  {
    id: 'headache-migraine',
    category: 'pain',
    title: 'Migraine Headache',
    description: 'Severe throbbing or pulsing pain, usually on one side of the head. May include nausea, vomiting, and sensitivity to light and sound.',
    keywords: ['migraine', 'headache', 'throbbing', 'nausea', 'light sensitivity'],
    urgencyHint: 'moderate',
    relatedConditions: ['Migraine disorder'],
  },
  {
    id: 'back-pain-lower',
    category: 'pain',
    title: 'Lower Back Pain',
    description: 'Pain in the lower back area that may be dull and achy or sharp and stabbing. May worsen with movement, sitting, or standing for long periods.',
    keywords: ['back pain', 'lower back', 'lumbar', 'spine'],
    urgencyHint: 'low',
    relatedConditions: ['Arthritis', 'Muscle strain', 'Disc problems'],
  },
  {
    id: 'joint-pain-knee',
    category: 'pain',
    title: 'Knee Pain',
    description: 'Pain in one or both knees, possibly with swelling, stiffness, or difficulty bending. May worsen when walking, climbing stairs, or standing up.',
    keywords: ['knee pain', 'joint pain', 'swelling', 'stiffness'],
    urgencyHint: 'low',
    relatedConditions: ['Arthritis', 'Bursitis', 'Meniscus tear'],
  },
  {
    id: 'joint-pain-hip',
    category: 'pain',
    title: 'Hip Pain',
    description: 'Pain in the hip joint or surrounding area, possibly radiating to the thigh or groin. May affect walking or getting up from seated position.',
    keywords: ['hip pain', 'joint pain', 'groin pain', 'walking difficulty'],
    urgencyHint: 'moderate',
    relatedConditions: ['Arthritis', 'Bursitis', 'Hip fracture'],
  },
  {
    id: 'shoulder-pain',
    category: 'pain',
    title: 'Shoulder Pain',
    description: 'Pain in the shoulder that may worsen when lifting the arm, reaching overhead, or lying on the affected side.',
    keywords: ['shoulder pain', 'arm pain', 'rotator cuff', 'frozen shoulder'],
    urgencyHint: 'low',
    relatedConditions: ['Rotator cuff injury', 'Frozen shoulder', 'Arthritis'],
  },
  {
    id: 'neck-pain',
    category: 'pain',
    title: 'Neck Pain and Stiffness',
    description: 'Pain or stiffness in the neck that may limit head movement. May radiate to shoulders or cause headaches.',
    keywords: ['neck pain', 'stiff neck', 'cervical', 'headache'],
    urgencyHint: 'low',
    relatedConditions: ['Cervical spondylosis', 'Muscle strain', 'Poor posture'],
  },
  {
    id: 'arthritis-hands',
    category: 'pain',
    title: 'Hand and Finger Pain (Arthritis)',
    description: 'Pain, stiffness, and swelling in the hands and fingers. May affect grip strength and fine motor skills like buttoning clothes.',
    keywords: ['hand pain', 'finger pain', 'arthritis', 'swelling', 'stiffness'],
    urgencyHint: 'low',
    relatedConditions: ['Osteoarthritis', 'Rheumatoid arthritis'],
  },
  {
    id: 'foot-pain',
    category: 'pain',
    title: 'Foot Pain',
    description: 'Pain in the foot, heel, or arch that may affect walking. Could be sharp when standing or dull ache at rest.',
    keywords: ['foot pain', 'heel pain', 'plantar fasciitis', 'walking'],
    urgencyHint: 'low',
    relatedConditions: ['Plantar fasciitis', 'Bunions', 'Neuropathy'],
  },
  {
    id: 'muscle-cramps',
    category: 'pain',
    title: 'Muscle Cramps',
    description: 'Sudden, involuntary muscle contractions that are painful. Often occurs in legs, especially at night.',
    keywords: ['muscle cramps', 'leg cramps', 'charley horse', 'spasm'],
    urgencyHint: 'low',
    relatedConditions: ['Dehydration', 'Electrolyte imbalance', 'Poor circulation'],
  },
  {
    id: 'chest-pain-non-cardiac',
    category: 'pain',
    title: 'Chest Discomfort (Non-Cardiac)',
    description: 'Chest discomfort that may be related to muscle strain, heartburn, or anxiety. NOT crushing or pressure-like pain.',
    keywords: ['chest pain', 'chest discomfort', 'heartburn', 'muscle'],
    urgencyHint: 'moderate',
    relatedConditions: ['GERD', 'Muscle strain', 'Anxiety'],
  },
  {
    id: 'abdominal-pain',
    category: 'pain',
    title: 'Abdominal Pain',
    description: 'Pain or cramping in the stomach or belly area. May be associated with eating, bowel movements, or have no clear trigger.',
    keywords: ['stomach pain', 'belly pain', 'abdominal', 'cramping'],
    urgencyHint: 'moderate',
    relatedConditions: ['Constipation', 'Gastritis', 'IBS'],
  },
  {
    id: 'nerve-pain',
    category: 'pain',
    title: 'Nerve Pain (Neuropathy)',
    description: 'Burning, tingling, or shooting pain, often in hands or feet. May include numbness or a "pins and needles" sensation.',
    keywords: ['nerve pain', 'neuropathy', 'tingling', 'numbness', 'burning'],
    urgencyHint: 'moderate',
    relatedConditions: ['Diabetic neuropathy', 'Peripheral neuropathy'],
  },
  {
    id: 'sciatica',
    category: 'pain',
    title: 'Sciatica (Leg Pain from Back)',
    description: 'Pain that radiates from the lower back through the hip and down the back of one leg. May include numbness or weakness.',
    keywords: ['sciatica', 'leg pain', 'back pain', 'radiating', 'shooting'],
    urgencyHint: 'moderate',
    relatedConditions: ['Herniated disc', 'Spinal stenosis'],
  },
  {
    id: 'fibromyalgia',
    category: 'pain',
    title: 'Widespread Body Pain',
    description: 'Chronic widespread muscle pain and tenderness throughout the body. Often accompanied by fatigue and sleep problems.',
    keywords: ['body pain', 'widespread pain', 'fibromyalgia', 'fatigue'],
    urgencyHint: 'moderate',
    relatedConditions: ['Fibromyalgia', 'Chronic fatigue syndrome'],
  },

  // ============================================
  // DIGESTIVE ISSUES (12 items)
  // ============================================
  {
    id: 'constipation',
    category: 'digestive',
    title: 'Constipation',
    description: 'Difficulty having bowel movements, infrequent stools (less than 3 times per week), or hard/dry stools that are painful to pass.',
    keywords: ['constipation', 'bowel', 'hard stool', 'straining'],
    urgencyHint: 'low',
    relatedConditions: ['Medication side effect', 'Dehydration', 'Low fiber diet'],
  },
  {
    id: 'diarrhea',
    category: 'digestive',
    title: 'Diarrhea',
    description: 'Loose, watery stools occurring more frequently than usual. May be accompanied by cramping, urgency, or bloating.',
    keywords: ['diarrhea', 'loose stool', 'watery', 'frequent bowel'],
    urgencyHint: 'moderate',
    relatedConditions: ['Infection', 'Medication side effect', 'Food intolerance'],
  },
  {
    id: 'nausea',
    category: 'digestive',
    title: 'Nausea',
    description: 'Feeling of sickness with an urge to vomit. May or may not lead to actual vomiting.',
    keywords: ['nausea', 'queasy', 'sick stomach', 'vomiting'],
    urgencyHint: 'moderate',
    relatedConditions: ['Medication side effect', 'Infection', 'Vertigo'],
  },
  {
    id: 'heartburn-gerd',
    category: 'digestive',
    title: 'Heartburn / Acid Reflux',
    description: 'Burning sensation in the chest or throat, often worse after eating or lying down. May include sour taste in mouth.',
    keywords: ['heartburn', 'acid reflux', 'GERD', 'burning chest', 'indigestion'],
    urgencyHint: 'low',
    relatedConditions: ['GERD', 'Hiatal hernia'],
  },
  {
    id: 'bloating',
    category: 'digestive',
    title: 'Bloating and Gas',
    description: 'Feeling of fullness or swelling in the abdomen. May be accompanied by excessive gas or discomfort.',
    keywords: ['bloating', 'gas', 'fullness', 'swelling', 'distension'],
    urgencyHint: 'low',
    relatedConditions: ['Food intolerance', 'IBS', 'Constipation'],
  },
  {
    id: 'loss-appetite',
    category: 'digestive',
    title: 'Loss of Appetite',
    description: 'Reduced desire to eat or feeling full after eating very little. May lead to unintentional weight loss.',
    keywords: ['appetite', 'not hungry', 'eating less', 'weight loss'],
    urgencyHint: 'moderate',
    relatedConditions: ['Depression', 'Medication side effect', 'Infection'],
  },
  {
    id: 'difficulty-swallowing',
    category: 'digestive',
    title: 'Difficulty Swallowing',
    description: 'Trouble swallowing food or liquids, feeling like food is stuck in the throat or chest, or pain when swallowing.',
    keywords: ['swallowing', 'dysphagia', 'choking', 'stuck food'],
    urgencyHint: 'urgent',
    relatedConditions: ['GERD', 'Stroke', 'Esophageal narrowing'],
  },
  {
    id: 'vomiting',
    category: 'digestive',
    title: 'Vomiting',
    description: 'Forceful expulsion of stomach contents. May be a single episode or repeated.',
    keywords: ['vomiting', 'throwing up', 'nausea', 'sick'],
    urgencyHint: 'moderate',
    relatedConditions: ['Infection', 'Food poisoning', 'Medication'],
  },
  {
    id: 'blood-stool',
    category: 'digestive',
    title: 'Blood in Stool',
    description: 'Bright red blood on toilet paper or in the toilet, or dark/black tarry stools.',
    keywords: ['blood', 'stool', 'rectal bleeding', 'black stool'],
    urgencyHint: 'urgent',
    relatedConditions: ['Hemorrhoids', 'Colon polyps', 'GI bleeding'],
  },
  {
    id: 'hemorrhoids',
    category: 'digestive',
    title: 'Hemorrhoids',
    description: 'Pain, itching, or swelling around the anus. May include bright red blood after bowel movements.',
    keywords: ['hemorrhoids', 'piles', 'rectal', 'itching', 'bleeding'],
    urgencyHint: 'low',
    relatedConditions: ['Constipation', 'Straining'],
  },
  {
    id: 'weight-loss-unexplained',
    category: 'digestive',
    title: 'Unexplained Weight Loss',
    description: 'Losing weight without trying to diet or exercise more. Loss of more than 5% body weight in 6-12 months.',
    keywords: ['weight loss', 'losing weight', 'unintentional', 'appetite'],
    urgencyHint: 'urgent',
    relatedConditions: ['Cancer', 'Diabetes', 'Thyroid disorder', 'Depression'],
  },
  {
    id: 'bowel-incontinence',
    category: 'digestive',
    title: 'Bowel Incontinence',
    description: 'Inability to control bowel movements, leading to unexpected leakage of stool.',
    keywords: ['bowel incontinence', 'fecal incontinence', 'accidents', 'leakage'],
    urgencyHint: 'moderate',
    relatedConditions: ['Nerve damage', 'Muscle weakness', 'Diarrhea'],
  },

  // ============================================
  // RESPIRATORY (8 items)
  // ============================================
  {
    id: 'shortness-breath',
    category: 'respiratory',
    title: 'Shortness of Breath',
    description: 'Difficulty breathing or feeling like you cannot get enough air. May occur with activity or at rest.',
    keywords: ['shortness of breath', 'breathless', 'dyspnea', 'breathing difficulty'],
    urgencyHint: 'urgent',
    relatedConditions: ['COPD', 'Heart failure', 'Asthma', 'Pneumonia'],
  },
  {
    id: 'chronic-cough',
    category: 'respiratory',
    title: 'Chronic Cough',
    description: 'Cough that persists for more than 3 weeks. May be dry or produce mucus/phlegm.',
    keywords: ['cough', 'chronic cough', 'persistent cough', 'phlegm'],
    urgencyHint: 'moderate',
    relatedConditions: ['COPD', 'GERD', 'Post-nasal drip', 'ACE inhibitor'],
  },
  {
    id: 'wheezing',
    category: 'respiratory',
    title: 'Wheezing',
    description: 'High-pitched whistling sound when breathing, especially when exhaling. May indicate narrowed airways.',
    keywords: ['wheezing', 'whistling', 'breathing', 'asthma'],
    urgencyHint: 'moderate',
    relatedConditions: ['Asthma', 'COPD', 'Allergies', 'Respiratory infection'],
  },
  {
    id: 'congestion',
    category: 'respiratory',
    title: 'Nasal Congestion',
    description: 'Stuffy or blocked nose making it difficult to breathe through the nose. May include runny nose or post-nasal drip.',
    keywords: ['congestion', 'stuffy nose', 'blocked nose', 'sinuses'],
    urgencyHint: 'low',
    relatedConditions: ['Cold', 'Allergies', 'Sinusitis'],
  },
  {
    id: 'sore-throat',
    category: 'respiratory',
    title: 'Sore Throat',
    description: 'Pain, scratchiness, or irritation of the throat that often worsens when swallowing.',
    keywords: ['sore throat', 'throat pain', 'scratchy', 'swallowing'],
    urgencyHint: 'low',
    relatedConditions: ['Cold', 'Flu', 'Strep throat', 'Allergies'],
  },
  {
    id: 'pneumonia-symptoms',
    category: 'respiratory',
    title: 'Possible Pneumonia',
    description: 'Cough with phlegm, fever, chills, and difficulty breathing. May include chest pain when breathing deeply.',
    keywords: ['pneumonia', 'chest infection', 'fever', 'cough', 'chills'],
    urgencyHint: 'urgent',
    relatedConditions: ['Pneumonia', 'Bronchitis'],
  },
  {
    id: 'sleep-apnea',
    category: 'respiratory',
    title: 'Sleep Apnea Symptoms',
    description: 'Loud snoring, gasping for air during sleep, waking up with dry mouth, morning headache, or excessive daytime sleepiness.',
    keywords: ['sleep apnea', 'snoring', 'gasping', 'daytime sleepiness'],
    urgencyHint: 'moderate',
    relatedConditions: ['Obstructive sleep apnea', 'Central sleep apnea'],
  },
  {
    id: 'copd-flare',
    category: 'respiratory',
    title: 'COPD Flare-Up',
    description: 'Worsening of usual COPD symptoms: increased shortness of breath, more coughing, change in mucus color or amount.',
    keywords: ['COPD', 'emphysema', 'flare', 'exacerbation', 'breathing'],
    urgencyHint: 'urgent',
    relatedConditions: ['COPD', 'Emphysema', 'Chronic bronchitis'],
  },

  // ============================================
  // CARDIOVASCULAR (8 items)
  // ============================================
  {
    id: 'chest-pain-cardiac',
    category: 'cardiovascular',
    title: 'Chest Pain (Possible Heart)',
    description: 'Chest pressure, tightness, or squeezing that may spread to jaw, neck, arm, or back. May occur with shortness of breath, sweating.',
    keywords: ['chest pain', 'heart', 'pressure', 'squeezing', 'arm pain'],
    urgencyHint: 'emergency',
    relatedConditions: ['Heart attack', 'Angina', 'Heart disease'],
  },
  {
    id: 'palpitations',
    category: 'cardiovascular',
    title: 'Heart Palpitations',
    description: 'Feeling like your heart is racing, pounding, fluttering, or skipping beats. May be brief or prolonged.',
    keywords: ['palpitations', 'racing heart', 'irregular heartbeat', 'flutter'],
    urgencyHint: 'moderate',
    relatedConditions: ['Atrial fibrillation', 'Anxiety', 'Caffeine'],
  },
  {
    id: 'high-blood-pressure',
    category: 'cardiovascular',
    title: 'High Blood Pressure Symptoms',
    description: 'Headache, shortness of breath, nosebleeds, or no symptoms at all. Often discovered during routine check.',
    keywords: ['blood pressure', 'hypertension', 'headache', 'nosebleed'],
    urgencyHint: 'moderate',
    relatedConditions: ['Hypertension', 'Cardiovascular disease'],
  },
  {
    id: 'swollen-legs',
    category: 'cardiovascular',
    title: 'Swollen Legs and Ankles',
    description: 'Swelling in the lower legs, ankles, or feet that may leave an indent when pressed. May be worse at end of day.',
    keywords: ['swelling', 'edema', 'legs', 'ankles', 'feet', 'water retention'],
    urgencyHint: 'moderate',
    relatedConditions: ['Heart failure', 'Kidney problems', 'Venous insufficiency'],
  },
  {
    id: 'dizziness-lightheaded',
    category: 'cardiovascular',
    title: 'Dizziness / Lightheadedness',
    description: 'Feeling faint, woozy, or unsteady. May occur when standing up quickly or without apparent trigger.',
    keywords: ['dizzy', 'lightheaded', 'faint', 'woozy', 'unsteady'],
    urgencyHint: 'moderate',
    relatedConditions: ['Low blood pressure', 'Dehydration', 'Heart arrhythmia'],
  },
  {
    id: 'cold-extremities',
    category: 'cardiovascular',
    title: 'Cold Hands and Feet',
    description: 'Persistently cold hands and feet, possibly with color changes (pale, blue, or red). May indicate circulation problems.',
    keywords: ['cold hands', 'cold feet', 'circulation', 'poor circulation'],
    urgencyHint: 'low',
    relatedConditions: ['Peripheral artery disease', 'Raynauds', 'Diabetes'],
  },
  {
    id: 'varicose-veins',
    category: 'cardiovascular',
    title: 'Varicose Vein Symptoms',
    description: 'Visible twisted, enlarged veins in the legs. May include aching, heaviness, burning, or itching.',
    keywords: ['varicose veins', 'leg veins', 'aching legs', 'spider veins'],
    urgencyHint: 'low',
    relatedConditions: ['Venous insufficiency', 'Varicose veins'],
  },
  {
    id: 'atrial-fibrillation',
    category: 'cardiovascular',
    title: 'Irregular Heartbeat (AFib)',
    description: 'Irregular, often rapid heartbeat that may feel like fluttering or thumping in the chest. May include fatigue, shortness of breath.',
    keywords: ['afib', 'atrial fibrillation', 'irregular', 'rapid heartbeat'],
    urgencyHint: 'urgent',
    relatedConditions: ['Atrial fibrillation', 'Heart disease'],
  },

  // ============================================
  // NEUROLOGICAL (10 items)
  // ============================================
  {
    id: 'memory-problems',
    category: 'neurological',
    title: 'Memory Problems',
    description: 'Difficulty remembering recent events, forgetting appointments, repeating questions, or getting lost in familiar places.',
    keywords: ['memory', 'forgetful', 'confusion', 'dementia', 'alzheimers'],
    urgencyHint: 'moderate',
    relatedConditions: ['Dementia', 'Alzheimers', 'Medication side effect'],
  },
  {
    id: 'confusion',
    category: 'neurological',
    title: 'Confusion or Disorientation',
    description: 'Sudden confusion about time, place, or people. May include difficulty thinking clearly or unusual behavior.',
    keywords: ['confusion', 'disorientation', 'altered mental status', 'delirium'],
    urgencyHint: 'urgent',
    relatedConditions: ['UTI', 'Dehydration', 'Medication', 'Stroke'],
  },
  {
    id: 'tremor',
    category: 'neurological',
    title: 'Tremor / Shaking',
    description: 'Involuntary shaking of hands, arms, head, or other body parts. May occur at rest or during movement.',
    keywords: ['tremor', 'shaking', 'trembling', 'parkinsons'],
    urgencyHint: 'moderate',
    relatedConditions: ['Parkinsons disease', 'Essential tremor', 'Medication'],
  },
  {
    id: 'stroke-warning',
    category: 'neurological',
    title: 'Possible Stroke Symptoms',
    description: 'Sudden numbness or weakness (especially one side), confusion, trouble speaking, vision problems, severe headache, difficulty walking.',
    keywords: ['stroke', 'numbness', 'weakness', 'face drooping', 'speech'],
    urgencyHint: 'emergency',
    relatedConditions: ['Stroke', 'TIA'],
  },
  {
    id: 'vertigo',
    category: 'neurological',
    title: 'Vertigo (Room Spinning)',
    description: 'Sensation that you or your surroundings are spinning or moving. May cause nausea, vomiting, or difficulty balancing.',
    keywords: ['vertigo', 'spinning', 'dizziness', 'balance', 'BPPV'],
    urgencyHint: 'moderate',
    relatedConditions: ['BPPV', 'Menieres disease', 'Inner ear problem'],
  },
  {
    id: 'numbness-tingling',
    category: 'neurological',
    title: 'Numbness or Tingling',
    description: 'Loss of sensation or "pins and needles" feeling in hands, feet, or other areas. May be constant or come and go.',
    keywords: ['numbness', 'tingling', 'pins needles', 'paresthesia'],
    urgencyHint: 'moderate',
    relatedConditions: ['Neuropathy', 'Carpal tunnel', 'Diabetes', 'B12 deficiency'],
  },
  {
    id: 'weakness-one-side',
    category: 'neurological',
    title: 'Weakness on One Side',
    description: 'Weakness or difficulty moving one arm, leg, or side of the face. May be sudden or gradual.',
    keywords: ['weakness', 'one side', 'arm', 'leg', 'stroke'],
    urgencyHint: 'emergency',
    relatedConditions: ['Stroke', 'TIA', 'Brain tumor'],
  },
  {
    id: 'seizure',
    category: 'neurological',
    title: 'Seizure',
    description: 'Uncontrolled shaking, stiffening, loss of consciousness, or staring spells. May be followed by confusion.',
    keywords: ['seizure', 'convulsion', 'fit', 'epilepsy', 'shaking'],
    urgencyHint: 'emergency',
    relatedConditions: ['Epilepsy', 'Stroke', 'Brain injury'],
  },
  {
    id: 'difficulty-speaking',
    category: 'neurological',
    title: 'Difficulty Speaking',
    description: 'Slurred speech, difficulty finding words, or trouble understanding what others say.',
    keywords: ['speech', 'slurred', 'aphasia', 'words', 'talking'],
    urgencyHint: 'urgent',
    relatedConditions: ['Stroke', 'TIA', 'Dementia'],
  },
  {
    id: 'headache-sudden-severe',
    category: 'neurological',
    title: 'Sudden Severe Headache',
    description: 'Extremely severe headache that comes on suddenly, often described as "the worst headache of my life".',
    keywords: ['headache', 'severe', 'sudden', 'worst', 'thunderclap'],
    urgencyHint: 'emergency',
    relatedConditions: ['Brain aneurysm', 'Stroke', 'Meningitis'],
  },

  // ============================================
  // MOBILITY & BALANCE (8 items)
  // ============================================
  {
    id: 'falls',
    category: 'mobility',
    title: 'Frequent Falls',
    description: 'Falling more often than usual, near-falls, or feeling unsteady when walking. May or may not result in injury.',
    keywords: ['falls', 'falling', 'unsteady', 'balance', 'trip'],
    urgencyHint: 'moderate',
    relatedConditions: ['Balance disorder', 'Medication', 'Vision problems', 'Muscle weakness'],
  },
  {
    id: 'difficulty-walking',
    category: 'mobility',
    title: 'Difficulty Walking',
    description: 'Trouble walking, shuffling gait, or needing support. May include stiffness, pain, or weakness in legs.',
    keywords: ['walking', 'gait', 'shuffling', 'mobility', 'legs'],
    urgencyHint: 'moderate',
    relatedConditions: ['Arthritis', 'Parkinsons', 'Stroke', 'Neuropathy'],
  },
  {
    id: 'balance-problems',
    category: 'mobility',
    title: 'Balance Problems',
    description: 'Feeling unsteady or off-balance, especially when standing or turning. May need to hold onto things for support.',
    keywords: ['balance', 'unsteady', 'wobbly', 'coordination'],
    urgencyHint: 'moderate',
    relatedConditions: ['Inner ear problem', 'Neuropathy', 'Medication'],
  },
  {
    id: 'muscle-weakness',
    category: 'mobility',
    title: 'Muscle Weakness',
    description: 'Reduced strength in arms or legs, difficulty lifting objects, climbing stairs, or getting up from a chair.',
    keywords: ['weakness', 'muscle', 'strength', 'lifting', 'standing'],
    urgencyHint: 'moderate',
    relatedConditions: ['Deconditioning', 'Nerve damage', 'Medication'],
  },
  {
    id: 'stiffness-morning',
    category: 'mobility',
    title: 'Morning Stiffness',
    description: 'Stiffness in joints or muscles when waking up that improves with movement. May last minutes to hours.',
    keywords: ['stiffness', 'morning', 'joints', 'muscles', 'arthritis'],
    urgencyHint: 'low',
    relatedConditions: ['Arthritis', 'Fibromyalgia', 'Polymyalgia'],
  },
  {
    id: 'limited-range-motion',
    category: 'mobility',
    title: 'Limited Range of Motion',
    description: 'Difficulty moving a joint through its full range, such as raising arm overhead or bending knee fully.',
    keywords: ['range of motion', 'stiff', 'cant move', 'joint'],
    urgencyHint: 'low',
    relatedConditions: ['Arthritis', 'Frozen shoulder', 'Contracture'],
  },
  {
    id: 'difficulty-standing',
    category: 'mobility',
    title: 'Difficulty Standing Up',
    description: 'Trouble getting up from a seated position without using arms for support. May need multiple attempts.',
    keywords: ['standing', 'getting up', 'chair', 'sit to stand'],
    urgencyHint: 'moderate',
    relatedConditions: ['Muscle weakness', 'Arthritis', 'Parkinsons'],
  },
  {
    id: 'drop-foot',
    category: 'mobility',
    title: 'Foot Drop',
    description: 'Difficulty lifting the front part of the foot, causing it to drag when walking. May cause tripping.',
    keywords: ['foot drop', 'dragging foot', 'tripping', 'walking'],
    urgencyHint: 'moderate',
    relatedConditions: ['Nerve damage', 'Stroke', 'Spinal stenosis'],
  },

  // ============================================
  // SKIN & WOUNDS (8 items)
  // ============================================
  {
    id: 'skin-rash',
    category: 'skin',
    title: 'Skin Rash',
    description: 'Red, itchy, or irritated area of skin. May be flat, raised, have bumps, or blisters.',
    keywords: ['rash', 'skin', 'itchy', 'red', 'irritation'],
    urgencyHint: 'low',
    relatedConditions: ['Allergic reaction', 'Eczema', 'Medication reaction'],
  },
  {
    id: 'dry-skin',
    category: 'skin',
    title: 'Dry, Itchy Skin',
    description: 'Skin that feels dry, rough, or scaly. May be itchy and prone to cracking, especially in winter.',
    keywords: ['dry skin', 'itchy', 'flaky', 'cracking', 'xerosis'],
    urgencyHint: 'low',
    relatedConditions: ['Xerosis', 'Eczema', 'Thyroid disorder'],
  },
  {
    id: 'wound-slow-healing',
    category: 'skin',
    title: 'Slow-Healing Wound',
    description: 'Cut, sore, or wound that is taking longer than usual to heal. May be on feet, legs, or other areas.',
    keywords: ['wound', 'sore', 'healing', 'ulcer', 'cut'],
    urgencyHint: 'moderate',
    relatedConditions: ['Diabetes', 'Poor circulation', 'Infection'],
  },
  {
    id: 'pressure-sore',
    category: 'skin',
    title: 'Pressure Sore (Bedsore)',
    description: 'Red, painful area or open sore on skin over bony areas like heels, hips, or tailbone from prolonged pressure.',
    keywords: ['pressure sore', 'bedsore', 'ulcer', 'skin breakdown'],
    urgencyHint: 'moderate',
    relatedConditions: ['Immobility', 'Poor nutrition'],
  },
  {
    id: 'bruising-easy',
    category: 'skin',
    title: 'Easy Bruising',
    description: 'Bruises appearing more easily or frequently than before, sometimes without known cause.',
    keywords: ['bruising', 'bruises', 'contusion', 'blood thinner'],
    urgencyHint: 'moderate',
    relatedConditions: ['Blood thinners', 'Low platelets', 'Vitamin deficiency'],
  },
  {
    id: 'skin-infection',
    category: 'skin',
    title: 'Skin Infection Signs',
    description: 'Area of skin that is red, warm, swollen, painful, or has pus. May have red streaks spreading from it.',
    keywords: ['infection', 'cellulitis', 'pus', 'red', 'warm', 'swollen'],
    urgencyHint: 'urgent',
    relatedConditions: ['Cellulitis', 'Abscess', 'Wound infection'],
  },
  {
    id: 'shingles',
    category: 'skin',
    title: 'Shingles (Painful Rash)',
    description: 'Painful, blistering rash usually appearing in a band or strip on one side of the body. May have tingling before rash appears.',
    keywords: ['shingles', 'herpes zoster', 'blisters', 'painful rash', 'band'],
    urgencyHint: 'urgent',
    relatedConditions: ['Shingles', 'Herpes zoster'],
  },
  {
    id: 'skin-cancer-warning',
    category: 'skin',
    title: 'Suspicious Skin Growth',
    description: 'New or changing mole, spot, or growth on skin. May have irregular borders, multiple colors, or be growing.',
    keywords: ['mole', 'skin cancer', 'growth', 'spot', 'melanoma'],
    urgencyHint: 'moderate',
    relatedConditions: ['Melanoma', 'Basal cell carcinoma', 'Squamous cell carcinoma'],
  },

  // ============================================
  // MENTAL HEALTH (7 items)
  // ============================================
  {
    id: 'depression',
    category: 'mental_health',
    title: 'Depression Symptoms',
    description: 'Persistent sadness, loss of interest in activities, hopelessness, changes in sleep or appetite, fatigue, or thoughts of death.',
    keywords: ['depression', 'sad', 'hopeless', 'low mood', 'no interest'],
    urgencyHint: 'moderate',
    relatedConditions: ['Major depression', 'Grief', 'Medication side effect'],
  },
  {
    id: 'anxiety',
    category: 'mental_health',
    title: 'Anxiety Symptoms',
    description: 'Excessive worry, feeling nervous or on edge, difficulty relaxing, racing thoughts, or physical symptoms like rapid heartbeat.',
    keywords: ['anxiety', 'worry', 'nervous', 'panic', 'stress'],
    urgencyHint: 'moderate',
    relatedConditions: ['Generalized anxiety', 'Panic disorder'],
  },
  {
    id: 'social-withdrawal',
    category: 'mental_health',
    title: 'Social Withdrawal',
    description: 'Avoiding social activities, not wanting to see family or friends, preferring to stay alone.',
    keywords: ['withdrawal', 'isolation', 'alone', 'avoiding people'],
    urgencyHint: 'moderate',
    relatedConditions: ['Depression', 'Dementia', 'Hearing loss'],
  },
  {
    id: 'irritability',
    category: 'mental_health',
    title: 'Irritability / Mood Changes',
    description: 'Easily annoyed, frustrated, or angry. May have mood swings or be different from usual personality.',
    keywords: ['irritable', 'angry', 'mood swings', 'frustrated', 'agitation'],
    urgencyHint: 'moderate',
    relatedConditions: ['Depression', 'Dementia', 'Pain', 'Medication'],
  },
  {
    id: 'apathy',
    category: 'mental_health',
    title: 'Lack of Motivation / Apathy',
    description: 'Loss of interest in things that used to be enjoyable, difficulty getting started on activities, not caring about things.',
    keywords: ['apathy', 'motivation', 'no interest', 'dont care'],
    urgencyHint: 'moderate',
    relatedConditions: ['Depression', 'Dementia', 'Parkinsons'],
  },
  {
    id: 'paranoia',
    category: 'mental_health',
    title: 'Paranoia / Suspicion',
    description: 'Unfounded beliefs that others are trying to harm, steal from, or deceive them. May accuse family of theft.',
    keywords: ['paranoia', 'suspicious', 'accusing', 'delusions'],
    urgencyHint: 'moderate',
    relatedConditions: ['Dementia', 'Delirium', 'Medication side effect'],
  },
  {
    id: 'hallucinations',
    category: 'mental_health',
    title: 'Hallucinations',
    description: 'Seeing, hearing, or sensing things that are not there. May be visual (people, animals) or auditory (voices).',
    keywords: ['hallucinations', 'seeing things', 'hearing voices'],
    urgencyHint: 'urgent',
    relatedConditions: ['Dementia', 'Delirium', 'Parkinsons', 'Medication'],
  },

  // ============================================
  // SLEEP ISSUES (6 items)
  // ============================================
  {
    id: 'insomnia',
    category: 'sleep',
    title: 'Insomnia / Trouble Sleeping',
    description: 'Difficulty falling asleep, staying asleep, or waking up too early. May not feel rested after sleep.',
    keywords: ['insomnia', 'cant sleep', 'trouble sleeping', 'awake'],
    urgencyHint: 'low',
    relatedConditions: ['Anxiety', 'Depression', 'Pain', 'Medication'],
  },
  {
    id: 'daytime-sleepiness',
    category: 'sleep',
    title: 'Excessive Daytime Sleepiness',
    description: 'Feeling very sleepy during the day, difficulty staying awake, or falling asleep during activities.',
    keywords: ['sleepy', 'drowsy', 'daytime', 'fatigue', 'tired'],
    urgencyHint: 'moderate',
    relatedConditions: ['Sleep apnea', 'Poor sleep quality', 'Medication'],
  },
  {
    id: 'restless-legs',
    category: 'sleep',
    title: 'Restless Legs Syndrome',
    description: 'Uncomfortable sensations in legs with an urge to move them, especially in the evening or when trying to sleep.',
    keywords: ['restless legs', 'RLS', 'legs moving', 'uncomfortable legs'],
    urgencyHint: 'low',
    relatedConditions: ['Restless legs syndrome', 'Iron deficiency'],
  },
  {
    id: 'night-waking',
    category: 'sleep',
    title: 'Frequent Night Waking',
    description: 'Waking up multiple times during the night. May be related to needing to urinate, pain, or no apparent cause.',
    keywords: ['waking up', 'night', 'interrupted sleep', 'bathroom'],
    urgencyHint: 'low',
    relatedConditions: ['Prostate problems', 'Diabetes', 'Sleep apnea'],
  },
  {
    id: 'nightmares',
    category: 'sleep',
    title: 'Nightmares / Night Terrors',
    description: 'Disturbing dreams that cause waking, or episodes of screaming, thrashing, or apparent terror during sleep.',
    keywords: ['nightmares', 'bad dreams', 'night terrors', 'screaming'],
    urgencyHint: 'moderate',
    relatedConditions: ['PTSD', 'Medication', 'REM sleep disorder'],
  },
  {
    id: 'sleep-walking',
    category: 'sleep',
    title: 'Sleep Walking / Acting Out Dreams',
    description: 'Walking, talking, or physically acting out dreams during sleep. May be unaware of actions.',
    keywords: ['sleepwalking', 'acting out dreams', 'REM disorder'],
    urgencyHint: 'moderate',
    relatedConditions: ['REM sleep behavior disorder', 'Medication'],
  },

  // ============================================
  // URINARY (7 items)
  // ============================================
  {
    id: 'frequent-urination',
    category: 'urinary',
    title: 'Frequent Urination',
    description: 'Needing to urinate more often than usual, including multiple times at night.',
    keywords: ['urination', 'frequent', 'bathroom', 'nocturia', 'bladder'],
    urgencyHint: 'moderate',
    relatedConditions: ['UTI', 'Diabetes', 'Prostate enlargement', 'Overactive bladder'],
  },
  {
    id: 'urinary-incontinence',
    category: 'urinary',
    title: 'Urinary Incontinence',
    description: 'Leaking urine unintentionally, with coughing/sneezing, or not being able to reach the bathroom in time.',
    keywords: ['incontinence', 'leaking urine', 'accidents', 'bladder control'],
    urgencyHint: 'moderate',
    relatedConditions: ['Stress incontinence', 'Urge incontinence', 'Prostate problems'],
  },
  {
    id: 'uti-symptoms',
    category: 'urinary',
    title: 'Urinary Tract Infection (UTI)',
    description: 'Burning or pain when urinating, frequent urge to urinate, cloudy or strong-smelling urine, pelvic discomfort.',
    keywords: ['UTI', 'burning', 'urination', 'cloudy urine', 'infection'],
    urgencyHint: 'moderate',
    relatedConditions: ['Urinary tract infection', 'Bladder infection'],
  },
  {
    id: 'blood-urine',
    category: 'urinary',
    title: 'Blood in Urine',
    description: 'Pink, red, or cola-colored urine, or visible blood. May or may not be painful.',
    keywords: ['blood', 'urine', 'hematuria', 'red urine'],
    urgencyHint: 'urgent',
    relatedConditions: ['UTI', 'Kidney stones', 'Bladder cancer', 'Prostate problems'],
  },
  {
    id: 'difficulty-urinating',
    category: 'urinary',
    title: 'Difficulty Urinating',
    description: 'Weak urine stream, straining to urinate, feeling like bladder doesnt empty completely, or dribbling.',
    keywords: ['urination', 'weak stream', 'straining', 'retention'],
    urgencyHint: 'moderate',
    relatedConditions: ['Prostate enlargement', 'Urethral stricture'],
  },
  {
    id: 'urinary-urgency',
    category: 'urinary',
    title: 'Urinary Urgency',
    description: 'Sudden, strong urge to urinate that is difficult to control. May lead to accidents if bathroom isnt reached quickly.',
    keywords: ['urgency', 'urge', 'rush', 'cant hold', 'overactive bladder'],
    urgencyHint: 'moderate',
    relatedConditions: ['Overactive bladder', 'UTI', 'Prostate problems'],
  },
  {
    id: 'kidney-pain',
    category: 'urinary',
    title: 'Kidney / Flank Pain',
    description: 'Pain in the side or back below the ribs. May be sharp or dull, constant or come in waves.',
    keywords: ['kidney pain', 'flank pain', 'side pain', 'back pain'],
    urgencyHint: 'urgent',
    relatedConditions: ['Kidney stones', 'Kidney infection', 'UTI'],
  },

  // ============================================
  // VISION & HEARING (6 items)
  // ============================================
  {
    id: 'vision-changes',
    category: 'vision_hearing',
    title: 'Vision Changes',
    description: 'Blurry vision, difficulty seeing at night, or gradual loss of vision. May affect one or both eyes.',
    keywords: ['vision', 'blurry', 'seeing', 'eyes', 'sight'],
    urgencyHint: 'moderate',
    relatedConditions: ['Cataracts', 'Macular degeneration', 'Glaucoma', 'Diabetes'],
  },
  {
    id: 'sudden-vision-loss',
    category: 'vision_hearing',
    title: 'Sudden Vision Loss',
    description: 'Sudden loss of vision in one or both eyes, sudden blind spots, or seeing flashing lights.',
    keywords: ['vision loss', 'blind', 'sudden', 'flashing lights'],
    urgencyHint: 'emergency',
    relatedConditions: ['Retinal detachment', 'Stroke', 'Glaucoma'],
  },
  {
    id: 'eye-pain',
    category: 'vision_hearing',
    title: 'Eye Pain or Redness',
    description: 'Pain in or around the eye, redness, sensitivity to light, or discharge from the eye.',
    keywords: ['eye pain', 'red eye', 'sensitive', 'discharge'],
    urgencyHint: 'moderate',
    relatedConditions: ['Conjunctivitis', 'Glaucoma', 'Infection'],
  },
  {
    id: 'hearing-loss',
    category: 'vision_hearing',
    title: 'Hearing Loss',
    description: 'Difficulty hearing conversations, needing to turn up TV volume, or trouble hearing in noisy environments.',
    keywords: ['hearing', 'deaf', 'cant hear', 'hard of hearing'],
    urgencyHint: 'low',
    relatedConditions: ['Age-related hearing loss', 'Ear wax', 'Ear infection'],
  },
  {
    id: 'tinnitus',
    category: 'vision_hearing',
    title: 'Ringing in Ears (Tinnitus)',
    description: 'Ringing, buzzing, hissing, or other sounds in the ears when no external sound is present.',
    keywords: ['tinnitus', 'ringing', 'buzzing', 'ears'],
    urgencyHint: 'low',
    relatedConditions: ['Age-related hearing loss', 'Ear wax', 'Medication'],
  },
  {
    id: 'ear-pain',
    category: 'vision_hearing',
    title: 'Ear Pain',
    description: 'Pain inside the ear, which may be sharp or dull. May include discharge, itching, or hearing changes.',
    keywords: ['ear pain', 'earache', 'infection', 'discharge'],
    urgencyHint: 'moderate',
    relatedConditions: ['Ear infection', 'Ear wax impaction', 'TMJ'],
  },

  // ============================================
  // GENERAL SYMPTOMS (5 items)
  // ============================================
  {
    id: 'fever',
    category: 'general',
    title: 'Fever',
    description: 'Body temperature above 100.4F (38C). May be accompanied by chills, sweating, headache, or body aches.',
    keywords: ['fever', 'temperature', 'chills', 'hot', 'sweating'],
    urgencyHint: 'moderate',
    relatedConditions: ['Infection', 'UTI', 'Pneumonia', 'Flu'],
  },
  {
    id: 'fatigue',
    category: 'general',
    title: 'Fatigue / Tiredness',
    description: 'Feeling extremely tired, lacking energy, or exhausted even after rest. May affect daily activities.',
    keywords: ['fatigue', 'tired', 'exhausted', 'no energy', 'weak'],
    urgencyHint: 'moderate',
    relatedConditions: ['Anemia', 'Thyroid disorder', 'Depression', 'Sleep apnea'],
  },
  {
    id: 'dehydration',
    category: 'general',
    title: 'Dehydration Signs',
    description: 'Feeling very thirsty, dry mouth, dark urine, dizziness, or confusion. May result from not drinking enough or illness.',
    keywords: ['dehydration', 'thirsty', 'dry mouth', 'dark urine'],
    urgencyHint: 'moderate',
    relatedConditions: ['Inadequate fluid intake', 'Diarrhea', 'Vomiting', 'Medication'],
  },
  {
    id: 'chills',
    category: 'general',
    title: 'Chills / Shivering',
    description: 'Feeling cold and shivering, possibly with goosebumps. May or may not be accompanied by fever.',
    keywords: ['chills', 'shivering', 'cold', 'shaking'],
    urgencyHint: 'moderate',
    relatedConditions: ['Infection', 'Fever', 'Hypothermia'],
  },
  {
    id: 'night-sweats',
    category: 'general',
    title: 'Night Sweats',
    description: 'Excessive sweating at night that soaks sleepwear or bedding, not related to room temperature.',
    keywords: ['night sweats', 'sweating', 'hot flashes', 'soaking'],
    urgencyHint: 'moderate',
    relatedConditions: ['Infection', 'Medication', 'Hormone changes', 'Cancer'],
  },
];

/**
 * Get symptoms by category
 */
export function getSymptomsByCategory(category: SymptomCategory): CommonSymptom[] {
  return COMMON_SYMPTOMS.filter(s => s.category === category);
}

/**
 * Search symptoms by keyword
 */
export function searchSymptoms(query: string): CommonSymptom[] {
  const lowerQuery = query.toLowerCase();
  return COMMON_SYMPTOMS.filter(s =>
    s.title.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get symptoms by urgency level
 */
export function getSymptomsByUrgency(urgency: CommonSymptom['urgencyHint']): CommonSymptom[] {
  return COMMON_SYMPTOMS.filter(s => s.urgencyHint === urgency);
}

/**
 * Get emergency symptoms (for quick reference)
 */
export function getEmergencySymptoms(): CommonSymptom[] {
  return COMMON_SYMPTOMS.filter(s => s.urgencyHint === 'emergency');
}

/**
 * Get all category counts
 */
export function getCategoryCounts(): Record<SymptomCategory, number> {
  const counts = {} as Record<SymptomCategory, number>;
  for (const category of Object.keys(SYMPTOM_CATEGORIES) as SymptomCategory[]) {
    counts[category] = COMMON_SYMPTOMS.filter(s => s.category === category).length;
  }
  return counts;
}
