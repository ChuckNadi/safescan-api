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
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: "text",
              text: `Analyze this image. First determine if this is an EDIBLE FOOD PRODUCT.

CRITICAL SAFETY CHECK:
- If this is NOT a food product (cleaning supplies, chemicals, medicine, poison, non-food items), set "is_edible": false
- If this IS a food product meant for human consumption, set "is_edible": true

Return ONLY valid JSON (no markdown, no explanation):

{
  "is_edible": true,
  "product_name": "Brand and Product Name",
  "product_type": "food|beverage|supplement|cleaning_product|chemical|prescription_drug|otc_medicine|cosmetic|unknown",
  "warning_message": null,
  "ingredients": [
    {
      "name": "Ingredient Name",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient|Chemical|Toxic",
      "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
      "description": "Detailed 2-3 sentence description explaining what this ingredient is, how it's made, why it's used, and important safety information",
      "concerns": ["specific health concern 1", "specific health concern 2"],
      "benefits": ["specific benefit 1", "specific benefit 2"],
      "dosage": {
        "child_6_12": "Specific mg/kg/day or mg/day (e.g., '7.5 mg/kg/day' or '150mg daily max'). Say 'NOT FOR CHILDREN' if not safe",
        "adult_male": "Specific mg/kg/day or mg/day for 70kg male (e.g., '500mg daily max')",
        "adult_female": "Specific mg/kg/day or mg/day for 60kg female (e.g., '400mg daily max')",
        "toxic_dose": "SPECIFIC toxic amount with effects (e.g., '>2000mg causes nausea, vomiting; >10,000mg causes kidney/liver damage; LD50: 5000mg/kg in rats'). NEVER be vague - always give numbers."
      },
      "sources": []
    }
  ],
  "allergens": ["milk", "soy", "wheat"],
  "warnings": ["Warning 1", "Warning 2"],
  "amazon_search": "Exact product name for Amazon search",
  "healthier_alternative": {
    "name": "Generic or natural alternative name",
    "type": "generic|natural|organic",
    "description": "Why this is a healthier/cheaper option"
  }
}

SAFETY LEVEL GUIDELINES:
- TOXIC: Non-food items, poisons, chemicals not meant for consumption
- DANGER: Artificial dyes (Red 40, Yellow 5, Blue 1), sodium nitrite/nitrate, BHA, BHT, aspartame, MSG, partially hydrogenated oils, brominated vegetable oil, TBHQ, titanium dioxide
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, palm oil, excessive sodium, caramel color, potassium sorbate, sodium benzoate
- SAFE: Natural ingredients, vitamins, minerals, water, basic whole foods

CRITICAL RULES FOR SOURCES:
1. ONLY include sources if you can provide the EXACT, REAL, WORKING URL to FDA, WHO, NIH, or .gov/.edu page
2. If you cannot find a real URL that exists, set "sources": [] (empty array)
3. NEVER make up or guess URLs - only use URLs you are certain exist
4. Preferred sources: fda.gov, who.int, nih.gov, efsa.europa.eu, cdc.gov

CRITICAL RULES FOR TOXIC DOSE:
1. ALWAYS provide SPECIFIC NUMBERS (mg, mg/kg, g)
2. ALWAYS include what symptoms/effects occur at that dose
3. Include LD50 data if available
4. NEVER say vague things like "excessive amounts" or "large quantities"
5. If truly unknown, say "No established toxic threshold - insufficient human data; LD50 in rats: [X mg/kg]"

NON-FOOD ITEMS:
If this is NOT food (cleaning products, chemicals, etc.):
- Set "is_edible": false
- Set appropriate "warning_message"
- Still analyze ingredients but mark as "TOXIC" safety level
- Provide toxic dose information for accidental ingestion
- DO NOT provide "alternatives" or recommendations

MEDICATIONS (prescription_drug or otc_medicine):
If this is a MEDICATION:
- Set "is_edible": true (medicines are meant to be consumed)
- Set "product_type": "prescription_drug" or "otc_medicine"
- For each active ingredient provide exact therapeutic dose, max daily dose, and overdose symptoms
- Include generic or natural alternatives if available

If image is blurry or unreadable, return: {"error": "NO_INGREDIENTS_FOUND"}
If image is not a product label at all, return: {"error": "NOT_A_PRODUCT_LABEL"}`
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
