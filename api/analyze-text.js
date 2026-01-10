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
    const { ingredients } = req.body;

    if (!ingredients) {
      return res.status(400).json({ error: 'No ingredients provided' });
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
          content: `You are a precise ingredient analyzer. Analyze ONLY the ingredients provided - do not add or guess any ingredients.

INGREDIENTS TO ANALYZE:
${ingredients}

CRITICAL RULES:
1. ONLY analyze ingredients that are in the provided list
2. NEVER add ingredients that weren't provided
3. If an ingredient is unclear, include it with a note
4. Analyze each ingredient for safety based on scientific data
5. Determine if these are food ingredients or non-food/toxic substances

Return ONLY valid JSON (no markdown):

{
  "is_edible": true,
  "product_name": "Unknown Product",
  "barcode": null,
  "product_type": "food|beverage|supplement|cleaning_product|chemical|prescription_drug|otc_medicine|cosmetic|unknown",
  "warning_message": null,
  "extraction_confidence": "high",
  "unreadable_sections": [],
  "raw_ingredients_text": "${ingredients}",
  "ingredients": [
    {
      "name": "EXACT ingredient name as provided",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient|Chemical|Toxic",
      "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
      "description": "What this ingredient is and why it's used in food (2-3 sentences)",
      "concerns": ["specific health concern if any"],
      "benefits": ["specific benefit if any"],
      "dosage": {
        "child_6_12": "Specific mg/kg/day or mg/day. Say 'NOT FOR CHILDREN' or 'TOXIC' if applicable",
        "adult_male": "Specific mg/kg/day or mg/day for 70kg male",
        "adult_female": "Specific mg/kg/day or mg/day for 60kg female",
        "toxic_dose": "SPECIFIC amount with symptoms (e.g., '>500mg causes nausea; >2g causes organ damage; LD50: 3000mg/kg'). NEVER be vague."
      },
      "sources": []
    }
  ],
  "total_ingredients_found": 0,
  "allergens": [],
  "warnings": [],
  "amazon_search": "search term based on ingredients",
  "healthier_alternative": null
}

SAFETY LEVELS:
- TOXIC: Non-food chemicals, poisons, substances not for human consumption
- DANGER: Red 40, Yellow 5, Yellow 6, Blue 1, Blue 2, sodium nitrite, sodium nitrate, BHA, BHT, aspartame, acesulfame potassium, MSG, partially hydrogenated oils, TBHQ, titanium dioxide
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, natural flavors (unspecified), palm oil, caramel color, sodium benzoate, potassium sorbate
- SAFE: Water, salt, sugar, flour, whole foods, vitamins, minerals, spices, natural oils

SOURCE RULES:
1. ONLY include sources with EXACT, REAL, VERIFIABLE URLs from fda.gov, who.int, nih.gov, efsa.europa.eu
2. If you cannot provide a real working URL, set "sources": [] (empty array)
3. NEVER guess or fabricate URLs

TOXIC DOSE RULES:
1. ALWAYS give SPECIFIC NUMBERS (mg, g, mg/kg)
2. ALWAYS describe symptoms at that dose
3. Include LD50 if known
4. NEVER use vague language like "excessive" or "too much"

NON-FOOD SUBSTANCES:
If these are NOT food ingredients:
- Set "is_edible": false
- Set "warning_message": "THESE ARE NOT FOOD INGREDIENTS - These chemicals are TOXIC if consumed"
- Provide toxic dose for accidental ingestion awareness
- Mark all as "TOXIC" safety level

Count and include "total_ingredients_found" accurately.`
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
