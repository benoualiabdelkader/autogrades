import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';

type AnalyzeRequest = {
  jsonData?: unknown;
  analysisType?: string;
  criteria?: string;
  customPrompt?: string;
};

const DATA_CONTEXT = `You are an expert data analyst for AutoGrader — an AI-powered educational grading and analytics platform.
When analyzing data, prioritize educational insights and actionable recommendations for teachers.
If the data contains student records, grades, or submissions, provide specific educational analysis.
Always return valid JSON. Be thorough but concise.`;

function buildAnalysisPrompt(analysisType: string | undefined, jsonData: unknown, criteria?: string, customPrompt?: string): { system: string; user: string } {
  const dataStr = JSON.stringify(jsonData, null, 2);
  const dataSize = dataStr.length;
  const truncatedData = dataSize > 15000 ? dataStr.slice(0, 15000) + '\n... (truncated)' : dataStr;
  const criteriaBlock = criteria ? `\nAdditional criteria: ${criteria}\n` : '';

  switch (analysisType) {
    case 'structure':
      return {
        system: `${DATA_CONTEXT} You are a JSON structure and schema analyst.`,
        user: `Analyze this JSON structure comprehensively:

1. **Overall Architecture**: Describe the data structure, nesting depth, and organization pattern.
2. **Schema Analysis**: Identify data types, required vs optional fields, and field naming conventions.
3. **Complexity Assessment**: Rate complexity and identify potential bottlenecks.
4. **Educational Relevance**: If this is educational data, identify which fields relate to students, grades, courses, or submissions.
5. **Optimization Suggestions**: Recommend structural improvements for better data handling.
6. **Completeness Check**: Identify missing fields that would be expected in this type of data.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "structure_score": 0-100, "depth_analysis": "...", "complexity": "low|medium|high", "field_count": N, "data_types_found": [...], "organization_quality": "...", "educational_fields": [...], "missing_recommended_fields": [...], "improvements": [...], "best_practices": [...], "overall_assessment": "..." }`
      };

    case 'validation':
      return {
        system: `${DATA_CONTEXT} You are a data validation and integrity expert.`,
        user: `Validate this JSON data thoroughly:

1. **Data Integrity**: Check for null values, empty strings, invalid types, and corrupt data.
2. **Consistency**: Verify naming conventions, date formats, and value ranges are consistent.
3. **Completeness**: Check if required fields are present in all records.
4. **Cross-Reference**: Verify relationships between related fields (e.g., grade values within valid ranges).
5. **Duplicate Detection**: Identify duplicate records or conflicting data.
6. **Educational Validity**: For grade data, verify scores are within valid ranges (0-100), dates make sense, student IDs are consistent.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "validation_score": 0-100, "integrity_status": "pass|warning|fail", "total_records": N, "valid_records": N, "consistency_issues": [{"field": "...", "issue": "...", "severity": "low|medium|high", "affected_count": N}], "completeness_percentage": 0-100, "duplicates_found": N, "quality_issues": [...], "missing_fields": [...], "invalid_values": [...], "recommendations": [...] }`
      };

    case 'quality':
      return {
        system: `${DATA_CONTEXT} You are a data quality assessment specialist with expertise in educational data.`,
        user: `Assess the quality of this JSON data:

1. **Accuracy**: How accurate and trustworthy does the data appear?
2. **Completeness**: What percentage of expected fields are populated?
3. **Consistency**: Are formats, naming, and values consistent across records?
4. **Timeliness**: If timestamps exist, is the data current?
5. **Usability**: How ready is this data for grading/analysis workflows?
6. **Grade Distribution**: If grade data exists, analyze the distribution (mean, median, std dev, pass rate).
7. **Student Engagement Signals**: Identify patterns in submission times, activity frequency, etc.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "quality_score": 0-100, "accuracy_rating": "excellent|good|fair|poor", "completeness_percentage": 0-100, "consistency_rating": "excellent|good|fair|poor", "reliability_score": 0-100, "usability_score": 0-100, "grade_distribution": {"mean": N, "median": N, "std_dev": N, "pass_rate": "N%", "grade_ranges": {"A": N, "B": N, "C": N, "D": N, "F": N}} | null, "engagement_patterns": [...], "data_issues": [...], "strengths": [...], "recommendations": [...] }`
      };

    case 'security':
      return {
        system: `${DATA_CONTEXT} You are a data security and privacy analyst focusing on educational data compliance.`,
        user: `Analyze this JSON for security and privacy concerns:

1. **PII Detection**: Identify personally identifiable information (names, emails, IDs, addresses, phone numbers).
2. **Sensitive Data**: Flag sensitive educational data (grades, disciplinary records, health info).
3. **FERPA Compliance**: Check if data handling follows FERPA guidelines for student data.
4. **Data Exposure Risks**: Identify fields that should be encrypted, hashed, or removed before sharing.
5. **Access Control**: Recommend which fields need restricted access levels.
6. **Anonymization**: Suggest which fields should be anonymized for reports or exports.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "security_score": 0-100, "pii_fields_found": [{"field": "...", "type": "name|email|id|phone|address|other", "risk": "low|medium|high"}], "sensitive_data_found": [...], "ferpa_compliance": "compliant|needs_review|non_compliant", "vulnerabilities": [...], "privacy_issues": [...], "anonymization_needed": [...], "security_recommendations": [...], "risk_level": "low|medium|high|critical" }`
      };

    case 'performance':
      return {
        system: `${DATA_CONTEXT} You are a data performance optimization expert.`,
        user: `Analyze this JSON for performance:

1. **Size Analysis**: Total size, average record size, largest fields.
2. **Structure Efficiency**: Are there deeply nested structures that could be flattened?
3. **Query Optimization**: How well-structured is this for filtering, searching, and aggregation?
4. **Indexing Suggestions**: Which fields would benefit from indexing?
5. **Batch Processing**: Is this data suitable for batch operations?
6. **Memory Footprint**: Estimate memory usage patterns.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "performance_score": 0-100, "total_size_bytes": N, "record_count": N, "avg_record_size": N, "nesting_depth": N, "efficiency_rating": "excellent|good|fair|poor", "indexable_fields": [...], "optimization_opportunities": [{"area": "...", "current": "...", "suggested": "...", "impact": "low|medium|high"}], "memory_implications": "...", "batch_readiness": "ready|needs_work|not_suitable", "recommendations": [...] }`
      };

    case 'schema':
      return {
        system: `${DATA_CONTEXT} You are a JSON Schema expert and data modeling specialist.`,
        user: `Analyze this JSON and generate comprehensive schema insights:

1. **Inferred Schema**: Generate the JSON Schema for this data.
2. **Data Types**: Map all fields to their detected types with examples.
3. **Required vs Optional**: Determine which fields appear in all records vs only some.
4. **Enumerations**: Detect fields with limited value sets (enums).
5. **Relationships**: Identify foreign key relationships between entities.
6. **Schema Evolution**: Suggest a versioned schema strategy.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "inferred_schema": {...}, "data_types": {"field": "type", ...}, "required_fields": [...], "optional_fields": [...], "enum_fields": [{"field": "...", "values": [...]}], "relationships": [{"from": "...", "to": "...", "type": "one-to-many|many-to-many"}], "schema_quality_score": 0-100, "recommendations": [...] }`
      };

    case 'comparison':
      return {
        system: `${DATA_CONTEXT} You are a data pattern recognition and analytics expert specializing in educational data.`,
        user: `Analyze this JSON for patterns, trends, and actionable insights:

1. **Data Patterns**: Identify repeating patterns, common value distributions, and clusters.
2. **Anomalies**: Find outliers, unusual values, and unexpected patterns.
3. **Trends**: If temporal data exists, identify trends over time.
4. **Correlations**: Find relationships between fields (e.g., attendance vs grades).
5. **Student Segmentation**: If student data, segment into performance groups with characteristics.
6. **Predictive Signals**: Identify early warning indicators for at-risk students.
7. **Actionable Insights**: Provide 3-5 specific actions a teacher should take based on this data.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "patterns": [{"name": "...", "description": "...", "confidence": "high|medium|low"}], "anomalies": [{"record": "...", "field": "...", "value": "...", "expected": "...", "severity": "low|medium|high"}], "trends": [...], "correlations": [{"fields": [...], "relationship": "...", "strength": "strong|moderate|weak"}], "student_segments": [{"name": "...", "count": N, "characteristics": [...], "recommendation": "..."}], "risk_indicators": [...], "actionable_insights": [...], "summary": "..." }`
      };

    case 'grading':
      return {
        system: `${DATA_CONTEXT} You are an expert educational assessment analyst.`,
        user: `Perform comprehensive grading analysis on this data:

1. **Grade Distribution**: Calculate mean, median, mode, standard deviation, and quartiles.
2. **Performance Tiers**: Categorize students into A/B/C/D/F tiers with counts and percentages.
3. **At-Risk Students**: Identify students significantly below average or showing declining trends.
4. **Top Performers**: Identify highest-achieving students.
5. **Rubric Alignment**: If rubric criteria are present, analyze alignment between criteria scores.
6. **Feedback Themes**: Identify common strengths and weaknesses across students.
7. **Improvement Plan**: For each performance tier, suggest specific interventions.
8. **Class Health Score**: Overall assessment of class performance health.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "class_health_score": 0-100, "grade_statistics": {"mean": N, "median": N, "mode": N, "std_dev": N, "min": N, "max": N, "q1": N, "q3": N}, "distribution": {"A": {"count": N, "percentage": "N%"}, "B": {...}, "C": {...}, "D": {...}, "F": {...}}, "pass_rate": "N%", "at_risk_students": [{"name": "...", "grade": N, "concern": "...", "intervention": "..."}], "top_performers": [{"name": "...", "grade": N, "strength": "..."}], "common_strengths": [...], "common_weaknesses": [...], "tier_interventions": {"high": "...", "medium": "...", "low": "..."}, "recommendations": [...] }`
      };

    case 'custom':
      return {
        system: `${DATA_CONTEXT} Follow the user's custom instructions precisely. Return detailed JSON analysis.`,
        user: `${customPrompt || 'Analyze this JSON data comprehensively with focus on educational insights.'}\n${criteriaBlock}\nJSON Data:\n${truncatedData}\n\nReturn a detailed JSON analysis with scores, findings, and actionable recommendations.`
      };

    default:
      return {
        system: `${DATA_CONTEXT} Provide comprehensive multi-dimensional analysis covering structure, quality, patterns, and educational insights.`,
        user: `Provide comprehensive analysis of this JSON:

1. **Structure & Organization**: Assess data architecture and naming quality.
2. **Data Quality**: Rate completeness, consistency, and accuracy.
3. **Key Patterns**: Identify important patterns and distributions.
4. **Educational Insights**: If educational data, provide grading/performance analysis.
5. **Issues & Risks**: List any data problems or security concerns.
6. **Recommendations**: Provide 5 prioritized actionable recommendations.
${criteriaBlock}
JSON Data:
${truncatedData}

Return JSON: { "overall_score": 0-100, "structure": {"score": 0-100, "assessment": "..."}, "quality": {"score": 0-100, "assessment": "..."}, "patterns": [...], "educational_insights": {...} | null, "issues": [...], "recommendations": [...], "summary": "..." }`
      };
  }
}

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

  const { system: systemPrompt, user: userPrompt } = buildAnalysisPrompt(analysisType, jsonData, criteria, customPrompt);

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
      max_tokens: 4096
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(rawContent);
    return res.status(200).json({
      success: true,
      analysis,
      metadata: {
        analysisType: analysisType || 'comprehensive',
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
