/**
 * Common word lists for input validation
 * Used for fuzzy matching suggestions when users enter potentially misspelled names
 */

// Common medications (~100 items)
export const COMMON_MEDICATIONS: string[] = [
  // Blood Pressure / Cardiovascular
  'Lisinopril', 'Amlodipine', 'Losartan', 'Metoprolol', 'Atenolol', 'Carvedilol',
  'Valsartan', 'Hydrochlorothiazide', 'Furosemide', 'Spironolactone', 'Diltiazem',
  'Verapamil', 'Nifedipine', 'Propranolol', 'Clonidine', 'Hydralazine',

  // Cholesterol
  'Atorvastatin', 'Simvastatin', 'Rosuvastatin', 'Pravastatin', 'Lovastatin',
  'Ezetimibe', 'Fenofibrate',

  // Diabetes
  'Metformin', 'Glipizide', 'Glyburide', 'Glimepiride', 'Pioglitazone',
  'Sitagliptin', 'Empagliflozin', 'Liraglutide', 'Insulin',

  // Thyroid
  'Levothyroxine', 'Synthroid', 'Liothyronine', 'Methimazole',

  // Pain / Anti-inflammatory
  'Acetaminophen', 'Ibuprofen', 'Naproxen', 'Aspirin', 'Meloxicam',
  'Celecoxib', 'Diclofenac', 'Tramadol', 'Gabapentin', 'Pregabalin',

  // Mental Health
  'Sertraline', 'Escitalopram', 'Fluoxetine', 'Paroxetine', 'Citalopram',
  'Venlafaxine', 'Duloxetine', 'Bupropion', 'Trazodone', 'Mirtazapine',
  'Alprazolam', 'Lorazepam', 'Clonazepam', 'Diazepam', 'Buspirone',
  'Quetiapine', 'Aripiprazole', 'Risperidone', 'Olanzapine', 'Lithium',

  // GI / Acid Reflux
  'Omeprazole', 'Pantoprazole', 'Esomeprazole', 'Lansoprazole', 'Ranitidine',
  'Famotidine', 'Sucralfate', 'Ondansetron', 'Metoclopramide',

  // Respiratory
  'Albuterol', 'Fluticasone', 'Montelukast', 'Budesonide', 'Tiotropium',
  'Ipratropium', 'Prednisone', 'Methylprednisolone',

  // Antibiotics
  'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Levofloxacin', 'Doxycycline',
  'Cephalexin', 'Metronidazole', 'Sulfamethoxazole', 'Trimethoprim', 'Nitrofurantoin',

  // Blood Thinners
  'Warfarin', 'Apixaban', 'Rivaroxaban', 'Clopidogrel', 'Dabigatran',

  // Other Common
  'Alendronate', 'Tamsulosin', 'Finasteride', 'Sildenafil', 'Allopurinol',
  'Colchicine', 'Cyclobenzaprine', 'Baclofen', 'Methocarbamol', 'Hydroxyzine',
  'Diphenhydramine', 'Cetirizine', 'Loratadine', 'Fexofenadine', 'Melatonin',
];

// Common supplements (~100 items)
export const COMMON_SUPPLEMENTS: string[] = [
  // Vitamins
  'Vitamin A', 'Vitamin B1', 'Vitamin B2', 'Vitamin B3', 'Vitamin B5',
  'Vitamin B6', 'Vitamin B7', 'Vitamin B9', 'Vitamin B12', 'Vitamin C',
  'Vitamin D', 'Vitamin D3', 'Vitamin E', 'Vitamin K', 'Vitamin K2',
  'B-Complex', 'Multivitamin', 'Prenatal', 'Thiamine', 'Riboflavin',
  'Niacin', 'Biotin', 'Folate', 'Folic Acid',

  // Minerals
  'Calcium', 'Magnesium', 'Zinc', 'Iron', 'Potassium', 'Selenium',
  'Copper', 'Manganese', 'Chromium', 'Iodine', 'Phosphorus', 'Boron',

  // Omega Fatty Acids
  'Fish Oil', 'Omega-3', 'Omega-6', 'Omega-9', 'Krill Oil', 'Flaxseed Oil',
  'Cod Liver', 'DHA', 'EPA',

  // Probiotics / Gut Health
  'Probiotics', 'Prebiotics', 'Digestive Enzymes', 'Fiber', 'Psyllium',

  // Joint / Bone Health
  'Glucosamine', 'Chondroitin', 'MSM', 'Collagen', 'Hyaluronic Acid',
  'Bone Support',

  // Energy / Performance
  'CoQ10', 'Coenzyme Q10', 'Creatine', 'L-Carnitine', 'Caffeine',
  'B12 Energy', 'Iron Plus',

  // Herbal / Natural
  'Turmeric', 'Curcumin', 'Ashwagandha', 'Ginseng', 'Elderberry',
  'Echinacea', 'Ginkgo Biloba', 'St Johns Wort', 'Valerian Root',
  'Milk Thistle', 'Saw Palmetto', 'Garlic', 'Green Tea', 'Ginger',
  'Cinnamon', 'Spirulina', 'Chlorella', 'Maca Root', 'Rhodiola',

  // Sleep / Relaxation
  'Melatonin', 'Magnesium Glycinate', 'GABA', 'L-Theanine', '5-HTP',
  'Sleep Support', 'Calm Formula',

  // Protein / Amino Acids
  'Whey Protein', 'Plant Protein', 'BCAA', 'Glutamine', 'Arginine',
  'Lysine', 'Tryptophan',

  // Specialty
  'Apple Cider', 'Berberine', 'Resveratrol', 'Quercetin', 'NAC',
  'Alpha Lipoic', 'Astaxanthin', 'Lutein', 'Zeaxanthin', 'Lecithin',
];

// Common foods (~200 items)
export const COMMON_FOODS: string[] = [
  // Proteins
  'Chicken', 'Beef', 'Pork', 'Turkey', 'Fish', 'Salmon', 'Tuna', 'Shrimp',
  'Lamb', 'Bacon', 'Ham', 'Sausage', 'Steak', 'Tilapia', 'Cod', 'Trout',
  'Crab', 'Lobster', 'Scallops', 'Mussels', 'Tofu', 'Tempeh', 'Seitan',

  // Eggs / Dairy
  'Eggs', 'Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Cottage Cheese',
  'Mozzarella', 'Cheddar', 'Parmesan', 'Feta', 'Ricotta', 'Sour Cream',

  // Grains / Carbs
  'Rice', 'Bread', 'Pasta', 'Noodles', 'Oatmeal', 'Cereal', 'Quinoa',
  'Barley', 'Couscous', 'Tortilla', 'Bagel', 'Muffin', 'Croissant',
  'Pancakes', 'Waffles', 'Toast', 'Crackers', 'Pita', 'Naan',

  // Vegetables
  'Broccoli', 'Carrots', 'Spinach', 'Lettuce', 'Tomato', 'Cucumber',
  'Celery', 'Onion', 'Garlic', 'Peppers', 'Mushrooms', 'Zucchini',
  'Squash', 'Eggplant', 'Asparagus', 'Cauliflower', 'Cabbage', 'Kale',
  'Brussels Sprouts', 'Green Beans', 'Peas', 'Corn', 'Potato', 'Sweet Potato',
  'Beets', 'Radish', 'Turnip', 'Artichoke', 'Okra', 'Bok Choy',

  // Fruits
  'Apple', 'Banana', 'Orange', 'Grapes', 'Strawberry', 'Blueberry',
  'Raspberry', 'Blackberry', 'Watermelon', 'Cantaloupe', 'Honeydew',
  'Mango', 'Pineapple', 'Peach', 'Pear', 'Plum', 'Cherry', 'Kiwi',
  'Papaya', 'Avocado', 'Lemon', 'Lime', 'Grapefruit', 'Coconut',
  'Pomegranate', 'Fig', 'Date', 'Apricot', 'Cranberry', 'Tangerine',

  // Legumes / Nuts
  'Beans', 'Lentils', 'Chickpeas', 'Black Beans', 'Kidney Beans', 'Pinto Beans',
  'Peanuts', 'Almonds', 'Walnuts', 'Cashews', 'Pecans', 'Pistachios',
  'Macadamia', 'Hazelnuts', 'Sunflower Seeds', 'Pumpkin Seeds', 'Chia Seeds',
  'Flax Seeds', 'Hemp Seeds', 'Sesame Seeds',

  // Beverages
  'Water', 'Coffee', 'Tea', 'Juice', 'Smoothie', 'Milk', 'Soda', 'Wine',
  'Beer', 'Lemonade', 'Iced Tea', 'Hot Chocolate', 'Espresso', 'Kombucha',

  // Prepared Foods / Meals
  'Soup', 'Salad', 'Sandwich', 'Burger', 'Pizza', 'Tacos', 'Burrito',
  'Sushi', 'Curry', 'Stir Fry', 'Casserole', 'Stew', 'Chili', 'Omelet',
  'Scrambled Eggs', 'Fried Rice', 'Grilled Chicken', 'Roast Beef',
  'Baked Fish', 'Meatballs', 'Meatloaf', 'Pot Roast', 'Lasagna',
  'Macaroni', 'Spaghetti', 'Fettuccine', 'Risotto', 'Pad Thai',

  // Snacks / Desserts
  'Chips', 'Popcorn', 'Pretzels', 'Nuts', 'Trail Mix', 'Granola',
  'Cookies', 'Cake', 'Pie', 'Ice Cream', 'Pudding', 'Brownie',
  'Donut', 'Candy', 'Chocolate', 'Fruit Salad', 'Yogurt Parfait',

  // Condiments / Extras
  'Olive Oil', 'Honey', 'Maple Syrup', 'Peanut Butter', 'Jelly', 'Jam',
  'Ketchup', 'Mustard', 'Mayo', 'Salsa', 'Hummus', 'Guacamole',
  'Soy Sauce', 'Vinegar', 'Hot Sauce', 'BBQ Sauce', 'Ranch', 'Italian',
];

// Get all words from a category
export function getWordList(category: 'medication' | 'supplement' | 'food'): string[] {
  switch (category) {
    case 'medication':
      return COMMON_MEDICATIONS;
    case 'supplement':
      return COMMON_SUPPLEMENTS;
    case 'food':
      return COMMON_FOODS;
    default:
      return [];
  }
}
