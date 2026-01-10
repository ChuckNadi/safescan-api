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

Return ONLY valid JSON:

{
  "is_edible": true,
  "product_name": "Unknown Product",
  "product_type": "food",
  "warning_message": null,
  "raw_ingredients_text": "${ingredients}",
  "ingredients": [
    {
      "name": "EXACT ingredient name as provided",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient",
      "safety_level": "SAFE|CAUTION|DANGER",
      "description": "What this ingredient is and why it's used in food",
      "concerns": ["specific health concern if any"],
      "benefits": ["specific benefit if any"],
      "dosage": {
        "child_6_12": "Specific safe amount (mg/day) or 'No established limit'",
        "adult_male": "Specific safe amount (mg/day) or 'No established limit'",
        "adult_female": "Specific safe amount (mg/day) or 'No established limit'",
        "toxic_dose": "Specific amount that causes harm with symptoms, or 'No known toxicity at food consumption levels'"
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
- DANGER: Red 40, Yellow 5, Yellow 6, Blue 1, sodium nitrite, BHA, BHT, aspartame, MSG, partially hydrogenated oils, TBHQ, titanium dioxide
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, palm oil, caramel color, sodium benzoate
- SAFE: Water, salt, sugar, flour, whole foods, vitamins, minerals, natural ingredients

Count and include "total_ingredients_found" accurately.`



          
First determine if these are EDIBLE FOOD ingredients or non-food/toxic substances.

Return ONLY valid JSON (no markdown, no explanation):

{
  "is_edible": true or false,
  "product_name": "Unknown Product",
  "product_type": "food|beverage|supplement|cleaning_product|chemical|medicine|cosmetic|unknown",
  "warning_message": "Only if NOT edible: Clear warning like 'THESE ARE NOT FOOD INGREDIENTS - These chemicals are TOXIC if consumed'",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient|Chemical|Toxic",
      "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
      "description": "Detailed 2-3 sentence description explaining what this ingredient is, its purpose, and safety information",
      "concerns": ["specific concern 1", "specific concern 2"],
      "benefits": ["specific benefit 1", "specific benefit 2"],
      "dosage": {
        "child_6_12": "Specific mg/kg/day or mg/day. Say 'NOT FOR CHILDREN' or 'TOXIC - NOT FOR CONSUMPTION' if applicable",
        "adult_male": "Specific mg/kg/day or mg/day for 70kg male",
        "adult_female": "Specific mg/kg/day or mg/day for 60kg female",
        "toxic_dose": "SPECIFIC amount with effects (e.g., '>500mg causes vomiting; >2g causes organ damage; LD50: 3000mg/kg'). NEVER be vague."
      },
      "sources": [
        {"title": "Source name", "url": "https://exact-real-url.gov/specific-page"}
      ]
    }
  ],
  "allergens": ["milk", "soy", "wheat"],
  "warnings": ["Warning 1"]
}



SAFETY LEVELS:
- TOXIC: Non-food chemicals, poisons, substances not for human consumption
- DANGER: Artificial dyes, sodium nitrite, BHA, BHT, aspartame, MSG, hydrogenated oils, TBHQ, titanium dioxide
- CAUTION: HFCS, carrageenan, artificial flavors, palm oil, caramel color, sodium benzoate
- SAFE: Natural ingredients, vitamins, minerals, whole foods

CRITICAL SOURCE RULES:
1. ONLY include sources with EXACT, REAL, VERIFIABLE URLs
2. If you cannot provide a real working URL, set "sources": [] (empty array)
3. NEVER guess or fabricate URLs
4. Only use: fda.gov, who.int, nih.gov, efsa.europa.eu, cdc.gov, pubmed.ncbi.nlm.nih.gov

CRITICAL TOXIC DOSE RULES:
1. ALWAYS give SPECIFIC NUMBERS (mg, g, mg/kg)
2. ALWAYS describe symptoms at that dose
3. Include LD50 if known
4. NEVER use vague language like "excessive" or "too much"

NON-FOOD SUBSTANCES:
If these are NOT food ingredients:
- Set "is_edible": false
- Provide toxic dose for accidental ingestion awareness
- Mark all as "TOXIC" safety level`
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.status(200).json({ success: true, content: data.choices[0].message.content });
    }
    
    return res.status(500).json({ error: 'No response from AI' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
