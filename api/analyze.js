export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        max_tokens: 3500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: "text",
              text: `You are a precise ingredient extraction tool. Your job is to read food labels EXACTLY as written.

CRITICAL EXTRACTION RULES:
1. ONLY list ingredients you can CLEARLY READ in the image
2. NEVER guess or make up ingredients
3. NEVER add ingredients that aren't visible
4. If you cannot read an ingredient clearly, mark it as "unreadable_[position]"
5. If the image is blurry or cut off, say which parts are unreadable
6. Extract ingredients in the EXACT ORDER they appear on the label
7. Include ALL ingredients - do not skip any
8. Include sub-ingredients in parentheses (e.g., "Contains 2% or less of: salt, sugar")

SAFETY CHECK:
- If this is NOT a food product (cleaning supplies, chemicals, medicine, poison), set "is_edible": false
- If this IS a food product meant for human consumption, set "is_edible": true

BARCODE EXTRACTION:
- If you see a barcode number, include it in "barcode" field
- UPC codes are 12 digits, EAN codes are 13 digits
- If no barcode visible, set "barcode": null

Return ONLY valid JSON (no markdown):

{
  "is_edible": true,
  "product_name": "EXACT brand and product name as shown on package",
  "barcode": "barcode number if visible, or null",
  "product_type": "food|beverage|supplement|cleaning_product|chemical|prescription_drug|otc_medicine|cosmetic|unknown",
  "warning_message": null,
  "extraction_confidence": "high|medium|low",
  "unreadable_sections": ["list any parts of label that were cut off or blurry"],
  "raw_ingredients_text": "Copy the EXACT ingredients text as written on the label, word for word",
  "ingredients": [
    {
      "name": "EXACT ingredient name as written on label",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient|Chemical|Toxic",
      "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
      "description": "What this ingredient is and why it's used (2-3 sentences)",
      "concerns": ["specific health concern if any"],
      "benefits": ["specific benefit if any"],
      "dosage": {
        "child_6_12": "Specific mg/kg/day or mg/day (e.g., '7.5 mg/kg/day'). Say 'NOT FOR CHILDREN' if unsafe",
        "adult_male": "Specific mg/kg/day or mg/day for 70kg male (e.g., '500mg daily max')",
        "adult_female": "Specific mg/kg/day or mg/day for 60kg female (e.g., '400mg daily max')",
        "toxic_dose": "SPECIFIC amount with symptoms (e.g., '>2000mg causes nausea; >10g causes liver damage; LD50: 5000mg/kg in rats'). NEVER be vague."
      },
      "sources": []
    }
  ],
  "total_ingredients_found": 0,
  "allergens": ["ONLY allergens explicitly stated on label"],
  "warnings": ["ONLY warnings explicitly stated on label"],
  "amazon_search": "exact product name for accurate Amazon search",
  "healthier_alternative": {
    "name": "specific healthier product name",
    "type": "organic|natural|generic",
    "description": "why this is healthier"
  }
}

SAFETY LEVELS:
- TOXIC: Non-food items, poisons, chemicals not meant for consumption
- DANGER: Artificial dyes (Red 40, Yellow 5, Yellow 6, Blue 1, Blue 2), sodium nitrite, sodium nitrate, BHA, BHT, aspartame, acesulfame potassium, MSG, partially hydrogenated oils, TBHQ, titanium dioxide, brominated vegetable oil, potassium bromate
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, natural flavors (unspecified), palm oil, caramel color, sodium benzoate, potassium sorbate, sulfites, polysorbate 80
- SAFE: Water, salt, sugar, flour, whole foods, vitamins, minerals, spices, natural oils (olive, coconut, sunflower)

ACCURACY REQUIREMENTS:
1. Count total ingredients and put in "total_ingredients_found"
2. Copy raw ingredients text EXACTLY in "raw_ingredients_text"
3. If image quality is poor, set "extraction_confidence": "low"
4. List any unreadable parts in "unreadable_sections"
5. If unsure about an ingredient, add description: "Unable to fully verify - please check original label"

SOURCE RULES:
1. ONLY include sources with EXACT, REAL, VERIFIABLE URLs from fda.gov, who.int, nih.gov, efsa.europa.eu
2. If you cannot provide a real working URL, set "sources": [] (empty array)
3. NEVER guess or fabricate URLs

TOXIC DOSE RULES:
1. ALWAYS provide SPECIFIC NUMBERS (mg, mg/kg, g)
2. ALWAYS include symptoms/effects at that dose
3. Include LD50 data if available
4. NEVER say vague things like "excessive amounts" or "large quantities"

NON-FOOD ITEMS:
If NOT food (cleaning products, chemicals):
- Set "is_edible": false
- Set appropriate "warning_message"
- Mark ingredients as "TOXIC" safety level
- Provide toxic dose for accidental ingestion

MEDICATIONS:
If this is a MEDICATION:
- Set "is_edible": true
- Set "product_type": "prescription_drug" or "otc_medicine"
- Provide exact therapeutic dose, max daily dose, and overdose symptoms
- Include generic alternatives if available

If image is not a food label: {"error": "NOT_A_FOOD_LABEL"}
If image is too blurry: {"error": "IMAGE_TOO_BLURRY", "suggestion": "Please take a clearer photo"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.status(200).json({ success: true, content: data.choices[0].message.content });
    }
    
    console.log('OpenRouter response:', JSON.stringify(data).substring(0, 500));
    return res.status(500).json({ error: 'No response from AI', debug: data });
    
  } catch (error) {
    console.error('Catch error:', error.message);
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
