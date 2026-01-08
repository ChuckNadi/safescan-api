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
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `Analyze these ingredients: ${ingredients}

First determine if these are EDIBLE FOOD ingredients or non-food/toxic substances.

Return ONLY valid JSON (no markdown, no explanation):

{
  "is_edible": true or false,
  "product_name": "Unknown Product",
  "product_type": "food|beverage|supplement|cleaning_product|chemical|prescription_drug|otc_medicine|cosmetic|unknown",
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
  "warnings": ["Contains artificial colors", "High sodium content"],
  "amazon_search": "Exact product name for Amazon search",
  "healthier_alternative": {
    "name": "Generic or natural alternative name",
    "type": "generic|natural|organic",
    "description": "Why this is a healthier/cheaper option"
  }
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
