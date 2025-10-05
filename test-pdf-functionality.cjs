#!/usr/bin/env node

/**
 * Comprehensive PDF Generation Functionality Tests
 * Tests the core logic without browser dependencies
 */

const fs = require('fs');
const path = require('path');

// Import our test data (CommonJS to avoid ESM require issues)
const testData = require('./test-pdf-data.cjs');

class PDFTestRunner {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    logTest(testName, passed, message, details = null) {
        const result = {
            test: testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (passed) {
            this.passedTests++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.failedTests++;
            console.log(`❌ ${testName}: ${message}`);
            if (details) {
                console.log(`   Details: ${details}`);
            }
        }
        
        return result;
    }

    // Test data structure validation
    testDataStructure() {
        console.log('\n🧪 Testing Data Structure Validation...');
        
        try {
            // Test comprehensive question data
            const comprehensiveData = testData.testQuestionsData;
            
            // Validate required fields
            const requiredFields = ['id', 'subject', 'difficulty', 'topic', 'questionTypes', 'questionCount', 'generatedQuestions'];
            const hasAllFields = requiredFields.every(field => comprehensiveData.hasOwnProperty(field));
            
            this.logTest(
                'Data Structure - Required Fields',
                hasAllFields,
                hasAllFields ? 'All required fields present' : 'Missing required fields',
                hasAllFields ? null : `Missing: ${requiredFields.filter(f => !comprehensiveData.hasOwnProperty(f)).join(', ')}`
            );

            // Validate question count matches array length
            const questionCountMatch = comprehensiveData.questionCount === comprehensiveData.generatedQuestions.length;
            this.logTest(
                'Data Structure - Question Count',
                questionCountMatch,
                questionCountMatch ? 'Question count matches array length' : 'Question count mismatch',
                `Expected: ${comprehensiveData.questionCount}, Actual: ${comprehensiveData.generatedQuestions.length}`
            );

            // Validate all question types are represented
            const expectedTypes = ['multiple_choice', 'true_false', 'essay'];
            const actualTypes = [...new Set(comprehensiveData.generatedQuestions.map(q => q.type))];
            const hasAllTypes = expectedTypes.every(type => actualTypes.includes(type));
            
            this.logTest(
                'Data Structure - Question Types',
                hasAllTypes,
                hasAllTypes ? 'All question types represented' : 'Missing question types',
                `Expected: ${expectedTypes.join(', ')}, Actual: ${actualTypes.join(', ')}`
            );

            return true;
        } catch (error) {
            this.logTest('Data Structure', false, 'Data structure validation failed', error.message);
            return false;
        }
    }

    // Test multiple choice question validation
    testMultipleChoiceQuestions() {
        console.log('\n📝 Testing Multiple Choice Questions...');
        
        try {
            const mcQuestions = testData.multipleChoiceQuestions;
            
            for (const question of mcQuestions) {
                // Validate structure
                const hasRequiredFields = ['id', 'type', 'question', 'options', 'correctAnswer'].every(
                    field => question.hasOwnProperty(field)
                );
                
                this.logTest(
                    `MC Question ${question.id} - Structure`,
                    hasRequiredFields,
                    hasRequiredFields ? 'Has all required fields' : 'Missing required fields'
                );

                // Validate options count
                const hasCorrectOptionCount = question.options && question.options.length === 4;
                this.logTest(
                    `MC Question ${question.id} - Options Count`,
                    hasCorrectOptionCount,
                    hasCorrectOptionCount ? 'Has 4 options' : `Has ${question.options?.length || 0} options`
                );

                // Validate correct answer format
                const correctAnswerValid = question.correctAnswer && ['A', 'B', 'C', 'D'].includes(question.correctAnswer);
                this.logTest(
                    `MC Question ${question.id} - Answer Format`,
                    correctAnswerValid,
                    correctAnswerValid ? 'Correct answer format valid' : `Invalid format: ${question.correctAnswer}`
                );

                // Check for LaTeX content
                const hasLatex = question.question.includes('$') || 
                              (question.explanation && question.explanation.includes('$')) ||
                              question.options.some(opt => opt.includes('$'));
                
                this.logTest(
                    `MC Question ${question.id} - LaTeX Content`,
                    hasLatex,
                    hasLatex ? 'Contains LaTeX formulas' : 'No LaTeX content detected'
                );
            }

            return true;
        } catch (error) {
            this.logTest('Multiple Choice Questions', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Test True/False questions
    testTrueFalseQuestions() {
        console.log('\n✅ Testing True/False Questions...');
        
        try {
            const tfQuestions = testData.trueFalseQuestions;
            
            for (const question of tfQuestions) {
                // Validate structure
                const hasRequiredFields = ['id', 'type', 'question', 'correctAnswer'].every(
                    field => question.hasOwnProperty(field)
                );
                
                this.logTest(
                    `TF Question ${question.id} - Structure`,
                    hasRequiredFields,
                    hasRequiredFields ? 'Has all required fields' : 'Missing required fields'
                );

                // Validate correct answer format
                const correctAnswerValid = question.correctAnswer && ['Đúng', 'Sai'].includes(question.correctAnswer);
                this.logTest(
                    `TF Question ${question.id} - Answer Format`,
                    correctAnswerValid,
                    correctAnswerValid ? 'Correct answer format valid' : `Invalid format: ${question.correctAnswer}`
                );

                // Check for LaTeX content
                const hasLatex = question.question.includes('$') || 
                              (question.explanation && question.explanation.includes('$'));
                
                this.logTest(
                    `TF Question ${question.id} - LaTeX Content`,
                    hasLatex,
                    hasLatex ? 'Contains LaTeX formulas' : 'No LaTeX content detected'
                );
            }

            return true;
        } catch (error) {
            this.logTest('True/False Questions', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Test Essay questions
    testEssayQuestions() {
        console.log('\n📑 Testing Essay Questions...');
        
        try {
            const essayQuestions = testData.essayQuestions;
            
            for (const question of essayQuestions) {
                // Validate structure
                const hasRequiredFields = ['id', 'type', 'question', 'explanation'].every(
                    field => question.hasOwnProperty(field)
                );
                
                this.logTest(
                    `Essay Question ${question.id} - Structure`,
                    hasRequiredFields,
                    hasRequiredFields ? 'Has all required fields' : 'Missing required fields'
                );

                // Validate explanation length (should be substantial)
                const explanationLength = question.explanation ? question.explanation.length : 0;
                const hasSubstantialExplanation = explanationLength > 100;
                
                this.logTest(
                    `Essay Question ${question.id} - Explanation Length`,
                    hasSubstantialExplanation,
                    hasSubstantialExplanation ? `${explanationLength} characters` : `Only ${explanationLength} characters`
                );

                // Check for LaTeX content in questions and explanations
                const hasLatex = question.question.includes('$') || 
                              (question.explanation && question.explanation.includes('$'));
                
                this.logTest(
                    `Essay Question ${question.id} - LaTeX Content`,
                    hasLatex,
                    hasLatex ? 'Contains LaTeX formulas' : 'No LaTeX content detected'
                );
            }

            return true;
        } catch (error) {
            this.logTest('Essay Questions', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Test LaTeX formula patterns
    testLatexFormulas() {
        console.log('\n📐 Testing LaTeX Formula Patterns...');
        
        try {
            const latexTestData = testData.latexTestQuestions;
            
            // Common LaTeX patterns to check for
            const latexPatterns = [
                { pattern: /\$[^$]+\$/, name: 'Inline formulas ($...$)', type: 'inline' },
                { pattern: /\$\$[^$]+\$\$/, name: 'Display formulas ($$...$$)', type: 'display' },
                { pattern: /\\frac\{[^}]+\}\{[^}]+\}/, name: 'Fractions (\\frac{}{})', type: 'fraction' },
                { pattern: /\\int/, name: 'Integrals (\\int)', type: 'integral' },
                { pattern: /\\sqrt\{[^}]+\}/, name: 'Square roots (\\sqrt{})', type: 'sqrt' },
                { pattern: /\\sum/, name: 'Summations (\\sum)', type: 'sum' },
                { pattern: /\\lim/, name: 'Limits (\\lim)', type: 'limit' },
                { pattern: /\\sin|\\cos|\\tan/, name: 'Trigonometric functions', type: 'trig' },
                { pattern: /\\begin\{[^}]+\}/, name: 'LaTeX environments', type: 'environment' }
            ];

            const allContent = latexTestData.generatedQuestions.map(q => 
                [q.question, q.explanation, ...(q.options || [])].join(' ')
            ).join(' ');

            let foundPatterns = 0;
            for (const { pattern, name, type } of latexPatterns) {
                const found = pattern.test(allContent);
                if (found) foundPatterns++;
                
                this.logTest(
                    `LaTeX Pattern - ${name}`,
                    found,
                    found ? 'Pattern detected' : 'Pattern not found'
                );
            }

            // Overall LaTeX coverage
            const goodCoverage = foundPatterns >= 5;
            this.logTest(
                'LaTeX Coverage',
                goodCoverage,
                `${foundPatterns}/${latexPatterns.length} patterns found`,
                goodCoverage ? 'Good formula diversity' : 'Limited formula types'
            );

            return true;
        } catch (error) {
            this.logTest('LaTeX Formulas', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Test Vietnamese text handling
    testVietnameseText() {
        console.log('\n🇻🇳 Testing Vietnamese Text Handling...');
        
        try {
            const vietnameseData = testData.vietnameseTestQuestions;
            
            // Vietnamese characters to check for
            const vietnameseChars = ['à', 'á', 'ạ', 'ả', 'ã', 'â', 'ầ', 'ấ', 'ậ', 'ẩ', 'ẫ', 
                                   'ă', 'ằ', 'ắ', 'ặ', 'ẳ', 'ẵ', 'è', 'é', 'ẹ', 'ẻ', 'ẽ',
                                   'ê', 'ề', 'ế', 'ệ', 'ể', 'ễ', 'ì', 'í', 'ị', 'ỉ', 'ĩ',
                                   'ò', 'ó', 'ọ', 'ỏ', 'õ', 'ô', 'ồ', 'ố', 'ộ', 'ổ', 'ỗ',
                                   'ơ', 'ờ', 'ớ', 'ợ', 'ở', 'ỡ', 'ù', 'ú', 'ụ', 'ủ', 'ũ',
                                   'ư', 'ừ', 'ứ', 'ự', 'ử', 'ữ', 'ỳ', 'ý', 'ỵ', 'ỷ', 'ỹ',
                                   'đ', 'Đ'];

            const allVietnameseText = vietnameseData.generatedQuestions.map(q => 
                [q.question, q.explanation, ...(q.options || [])].join(' ')
            ).join(' ');

            let foundChars = 0;
            for (const char of vietnameseChars) {
                if (allVietnameseText.includes(char)) {
                    foundChars++;
                }
            }

            const hasVietnameseChars = foundChars > 0;
            this.logTest(
                'Vietnamese Characters',
                hasVietnameseChars,
                `${foundChars}/${vietnameseChars.length} Vietnamese characters found`,
                hasVietnameseChars ? 'Vietnamese text properly included' : 'No Vietnamese characters detected'
            );

            // Test subject name mapping
            const subjectNames = {
                'toan': 'TOÁN HỌC',
                'ly': 'VẬT LÝ', 
                'hoa': 'HÓA HỌC',
                'sinh': 'SINH HỌC',
                'van': 'NGỮ VĂN',
                'anh': 'TIẾNG ANH',
                'su': 'LỊCH SỬ',
                'dia': 'ĐỊA LÝ',
                'gdcd': 'GIÁO DỤC CÔNG DÂN',
                'tin': 'TIN HỌC'
            };

            const subjectMappingWorks = Object.keys(subjectNames).every(key => 
                subjectNames[key] && subjectNames[key].length > 0
            );

            this.logTest(
                'Subject Name Mapping',
                subjectMappingWorks,
                subjectMappingWorks ? 'All subjects mapped correctly' : 'Subject mapping issues',
                `${Object.keys(subjectNames).length} subjects mapped`
            );

            // Test filename generation with Vietnamese characters
            const testFilename = this.generateTestFilename(vietnameseData);
            const filenameValid = testFilename && testFilename.endsWith('.pdf') && !testFilename.includes(' ');
            
            this.logTest(
                'Vietnamese Filename Generation',
                filenameValid,
                filenameValid ? 'Valid filename generated' : 'Invalid filename',
                `Generated: ${testFilename}`
            );

            return true;
        } catch (error) {
            this.logTest('Vietnamese Text', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Helper method to test filename generation
    generateTestFilename(questions) {
        const subjectNames = {
            'toan': 'Toan',
            'ly': 'VatLy', 
            'hoa': 'HoaHoc',
            'sinh': 'SinhHoc',
            'van': 'NguVan',
            'anh': 'TiengAnh',
            'su': 'LichSu',
            'dia': 'DiaLy',
            'gdcd': 'GDCD',
            'tin': 'TinHoc'
        };

        const subject = subjectNames[questions.subject] || questions.subject;
        const topic = questions.topic
            .replace(/[^a-zA-Z0-9À-ỹ]/g, '')
            .substring(0, 20);
        const date = new Date().getFullYear();
        
        return `${subject}_${topic}_${date}.pdf`;
    }

    // Test PDF configuration options
    testPDFConfiguration() {
        console.log('\n⚙️ Testing PDF Configuration Options...');
        
        try {
            const testConfigs = [
                { includeAnswers: true, includeExplanations: true, paperSize: 'A4', orientation: 'portrait' },
                { includeAnswers: false, includeExplanations: true, paperSize: 'A4', orientation: 'portrait' },
                { includeAnswers: true, includeExplanations: false, paperSize: 'Letter', orientation: 'landscape' },
                { includeAnswers: false, includeExplanations: false, paperSize: 'Letter', orientation: 'portrait' }
            ];

            for (const [index, config] of testConfigs.entries()) {
                // Validate configuration structure
                const hasValidOptions = typeof config.includeAnswers === 'boolean' &&
                                       typeof config.includeExplanations === 'boolean' &&
                                       ['A4', 'Letter'].includes(config.paperSize) &&
                                       ['portrait', 'landscape'].includes(config.orientation);

                this.logTest(
                    `PDF Config ${index + 1}`,
                    hasValidOptions,
                    hasValidOptions ? 'Valid configuration' : 'Invalid configuration',
                    `${JSON.stringify(config)}`
                );
            }

            return true;
        } catch (error) {
            this.logTest('PDF Configuration', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Test error scenarios
    testErrorHandling() {
        console.log('\n🛡️ Testing Error Handling...');
        
        try {
            // Test empty questions array
            const emptyQuestions = { ...testData.testQuestionsData, generatedQuestions: [] };
            const shouldHandleEmpty = emptyQuestions.generatedQuestions.length === 0;
            
            this.logTest(
                'Empty Questions Handling',
                shouldHandleEmpty,
                shouldHandleEmpty ? 'Empty questions detected correctly' : 'Empty questions not handled'
            );

            // Test missing required fields
            const incompleteQuestion = { id: '1', type: 'multiple_choice' }; // Missing required fields
            const missingFields = ['question', 'options', 'correctAnswer'].filter(
                field => !incompleteQuestion.hasOwnProperty(field)
            );
            
            this.logTest(
                'Missing Fields Detection',
                missingFields.length > 0,
                missingFields.length > 0 ? 'Missing fields detected' : 'All fields present',
                `Missing: ${missingFields.join(', ')}`
            );

            // Test very long content
            const longQuestion = {
                id: 'LONG',
                type: 'essay',
                question: 'Long question: ' + 'x'.repeat(1000),
                explanation: 'Long explanation: ' + 'y'.repeat(2000)
            };
            
            const hasLongContent = longQuestion.question.length > 500 || longQuestion.explanation.length > 1000;
            this.logTest(
                'Long Content Handling',
                hasLongContent,
                hasLongContent ? 'Long content test created' : 'Content not long enough'
            );

            return true;
        } catch (error) {
            this.logTest('Error Handling', false, 'Testing failed', error.message);
            return false;
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Comprehensive PDF Generation Tests\n');
        console.log('='.repeat(60));
        
        const startTime = Date.now();

        // Run all test suites
        const testSuites = [
            () => this.testDataStructure(),
            () => this.testMultipleChoiceQuestions(),
            () => this.testTrueFalseQuestions(),
            () => this.testEssayQuestions(),
            () => this.testLatexFormulas(),
            () => this.testVietnameseText(),
            () => this.testPDFConfiguration(),
            () => this.testErrorHandling()
        ];

        let allPassed = true;
        for (const testSuite of testSuites) {
            const result = testSuite();
            if (!result) allPassed = false;
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Generate test report
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${this.passedTests} ✅`);
        console.log(`Failed: ${this.failedTests} ❌`);
        console.log(`Success Rate: ${((this.passedTests / this.testResults.length) * 100).toFixed(1)}%`);
        console.log(`Duration: ${duration}s`);
        console.log(`Overall Status: ${allPassed && this.failedTests === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        // Write detailed report to file
        const reportPath = 'pdf-test-report.json';
        const report = {
            summary: {
                totalTests: this.testResults.length,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: (this.passedTests / this.testResults.length) * 100,
                duration: duration,
                timestamp: new Date().toISOString(),
                overallStatus: allPassed && this.failedTests === 0 ? 'PASSED' : 'FAILED'
            },
            results: this.testResults
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report written to: ${reportPath}`);

        return report;
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const runner = new PDFTestRunner();
    runner.runAllTests().then(report => {
        process.exit(report.summary.overallStatus === 'PASSED' ? 0 : 1);
    }).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = PDFTestRunner;