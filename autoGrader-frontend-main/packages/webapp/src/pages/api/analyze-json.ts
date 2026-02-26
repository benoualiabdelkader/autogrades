import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';

type AnalyzeRequest = {
  jsonData?: unknown;
  analysisType?: string;
  criteria?: string;
  customPrompt?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { jsonData, analysisType, criteria, customPrompt } = (req.body || {}) as AnalyzeRequest;
  if (!jsonData) {
    return res.status(400).json({ error: 'No JSON data provided' });
  }

  let systemPrompt = '';
  let userPrompt = '';

  switch (analysisType) {
    case 'structure':
      systemPrompt = 'You are a JSON structure analyzer. Analyze structure, depth, complexity, and organization.';
      userPrompt = `Analyze this JSON structure and provide:
1. Overall structure assessment
2. Depth and complexity analysis
3. Data organization quality
4. Potential improvements
5. Best practices compliance

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "structure_score": 0-100, "depth_analysis": "...", "complexity": "low/medium/high", "organization_quality": "...", "improvements": [], "best_practices": [], "overall_assessment": "..." }`;
      break;
    case 'validation':
      systemPrompt = 'You are a JSON validation expert. Check integrity, consistency, completeness, and quality issues.';
      userPrompt = `Validate this JSON data and provide:
1. Data integrity check
2. Consistency analysis
3. Completeness assessment
4. Quality issues
5. Missing or invalid fields

${criteria ? `Validation Criteria:\n${criteria}\n\n` : ''}JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "validation_score": 0-100, "integrity": "pass/fail", "consistency_issues": [], "completeness": "...", "quality_issues": [], "missing_fields": [], "invalid_fields": [], "recommendations": [] }`;
      break;
    case 'quality':
      systemPrompt = 'You are a data quality analyst. Assess the quality, accuracy, and reliability of JSON data.';
      userPrompt = `Assess quality of this JSON data:
1. Data accuracy
2. Completeness
3. Consistency
4. Reliability
5. Usability

${criteria ? `Quality Criteria:\n${criteria}\n\n` : ''}JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "quality_score": 0-100, "accuracy": "...", "completeness_percentage": 0-100, "consistency_rating": "excellent/good/fair/poor", "reliability": "...", "usability": "...", "issues": [], "strengths": [], "recommendations": [] }`;
      break;
    case 'security':
      systemPrompt = 'You are a security analyst. Identify potential security and privacy issues in JSON data.';
      userPrompt = `Analyze this JSON for security concerns:
1. Sensitive data exposure
2. Security vulnerabilities
3. Privacy issues
4. Data protection compliance
5. Security best practices

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "security_score": 0-100, "sensitive_data_found": [], "vulnerabilities": [], "privacy_issues": [], "compliance_status": "...", "security_recommendations": [], "risk_level": "low/medium/high/critical" }`;
      break;
    case 'performance':
      systemPrompt = 'You are a performance optimization expert. Analyze JSON structure for performance impacts.';
      userPrompt = `Analyze this JSON for performance:
1. Size and efficiency
2. Structure optimization
3. Query performance
4. Memory usage implications
5. Optimization opportunities

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "performance_score": 0-100, "size_analysis": "...", "efficiency_rating": "...", "optimization_opportunities": [], "memory_implications": "...", "query_performance": "...", "recommendations": [] }`;
      break;
    case 'schema':
      systemPrompt = 'You are a JSON Schema expert. Generate schema insights from input JSON.';
      userPrompt = `Analyze this JSON and generate schema insights:
1. Inferred schema
2. Data types analysis
3. Required fields
4. Optional fields
5. Schema recommendations

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "inferred_schema": {}, "data_types": {}, "required_fields": [], "optional_fields": [], "schema_quality": "...", "recommendations": [] }`;
      break;
    case 'comparison':
      systemPrompt = 'You are a data comparison expert. Identify patterns, differences, and anomalies.';
      userPrompt = `Analyze this JSON for patterns and insights:
1. Data patterns
2. Anomalies
3. Trends
4. Relationships
5. Insights

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return JSON with: { "patterns": [], "anomalies": [], "trends": [], "relationships": [], "insights": [], "summary": "..." }`;
      break;
    case 'custom':
      systemPrompt = 'You are an expert JSON analyst. Provide detailed analysis based on custom requirements.';
      userPrompt = `${customPrompt || 'Analyze this JSON data comprehensively.'}\n\nJSON Data:\n${JSON.stringify(jsonData, null, 2)}\n\nReturn a detailed JSON analysis.`;
      break;
    default:
      systemPrompt = 'You are a comprehensive JSON analyzer. Cover structure, quality, and actionable insights.';
      userPrompt = `Provide comprehensive analysis of this JSON:
1. Structure and organization
2. Data quality
3. Potential issues
4. Insights and patterns
5. Recommendations

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Return a JSON object with comprehensive analysis.`;
  }

  try {
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
    return res.status(200).json({
      success: true,
      analysis,
      metadata: {
        analysisType: analysisType || 'default',
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(jsonData).length,
        model: 'llama-3.3-70b-versatile'
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Analysis failed',
      details: error?.message || 'Unknown error'
    });
  }
}
