/**
 * 快速标注功能修复和增强脚本 v4.2
 * 独立加载，修复快速标注失效问题
 */

(function() {
    'use strict';

    console.log('🔧 正在加载快速标注修复脚本...');

    // 等待DOM和script.js加载完成
    function init() {
        if (typeof state === 'undefined' || typeof dom === 'undefined') {
            console.log('⏳ 等待主脚本加载...');
            setTimeout(init, 100);
            return;
        }

        console.log('✅ 主脚本已加载，开始修复快速标注功能');
        setupQuickAnnotate();
        enhanceToastSystem();
        improveErrorHandling();
    }

    // 设置快速标注功能
    function setupQuickAnnotate() {
        // 智能默认值配置
        const CATEGORY_DEFAULTS = {
            vocab: {
                color: 'honey',
                bold: true,
                emoji: '⭐',
                borderStyle: 'none',
                underline: false
            },
            phrase: {
                color: 'mint',
                bold: false,
                underline: true,
                emoji: '',
                borderStyle: 'none'
            },
            difficulty: {
                color: 'sunset',
                bold: true,
                emoji: '❗',
                borderStyle: 'round',
                underline: false
            },
            keypoint: {
                color: 'sky',
                bold: true,
                emoji: '💡',
                borderStyle: 'square',
                underline: false
            },
            translation: {
                color: 'orchid',
                bold: false,
                underline: true,
                emoji: '',
                borderStyle: 'none'
            }
        };

        // 快速标注函数
        window.quickAnnotate = function(category) {
            console.log('🚀 执行快速标注:', category);

            // 检查是否有选中文本
            if (!state || !state.activeRange) {
                showToast('⚠️ 请先选中要标注的文本', 'warning');
                return;
            }

            const defaults = CATEGORY_DEFAULTS[category] || {};
            const selectedText = state.activeRange.toString().trim();

            if (!selectedText) {
                showToast('⚠️ 请选中有效的文本', 'warning');
                return;
            }

            try {
                // 更新状态
                state.lastCategory = category;
                state.lastColor = defaults.color || 'honey';
                state.lastBold = defaults.bold || false;
                state.lastUnderline = defaults.underline || false;
                state.lastStrikethrough = false;
                state.lastBorderStyle = defaults.borderStyle || 'none';
                state.lastEmoji = defaults.emoji || '';
                state.lastShowNoteBelow = false;

                // 创建标注对象
                const annotation = {
                    id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    text: selectedText,
                    category: category,
                    customCategory: category === 'custom' ? (state.lastCustomCategory || '自定义') : '',
                    color: state.lastColor,
                    underline: state.lastUnderline,
                    bold: state.lastBold,
                    strikethrough: state.lastStrikethrough,
                    borderStyle: state.lastBorderStyle,
                    emoji: state.lastEmoji,
                    note: '',
                    tags: [],
                    timestamp: new Date().toISOString(),
                    showNoteBelow: false
                };

                // 应用高亮
                if (typeof applyHighlight === 'function') {
                    applyHighlight(annotation);
                } else {
                    console.error('❌ applyHighlight函数未定义');
                    showToast('❌ 标注功能未正确加载', 'error');
                    return;
                }

                // 保存到状态
                state.annotations.push(annotation);

                // 持久化
                if (typeof persistState === 'function') {
                    persistState();
                }

                // 更新列表
                if (typeof renderAnnotationsList === 'function') {
                    renderAnnotationsList();
                }

                // 清理UI
                if (dom && dom.selectionToolbar) {
                    dom.selectionToolbar.classList.add('hidden');
                }

                window.getSelection().removeAllRanges();
                state.activeRange = null;

                // 显示成功提示
                const categoryNames = {
                    vocab: '生词',
                    keypoint: '重点',
                    difficulty: '疑难',
                    phrase: '词组',
                    translation: '翻译'
                };
                showToast(`✓ ${categoryNames[category] || category}标注已保存`, 'success');

            } catch (error) {
                console.error('❌ 快速标注失败:', error);
                showToast('❌ 标注失败: ' + error.message, 'error');
            }
        };

        console.log('✅ 快速标注功能已修复并增强');
    }

    // 增强Toast提示系统
    function enhanceToastSystem() {
        // 全局Toast函数
        window.showToast = function(message, type = 'success') {
            // 移除已存在的toast
            const existingToasts = document.querySelectorAll('.toast');
            existingToasts.forEach(toast => toast.remove());

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;

            // 根据类型设置图标
            const icons = {
                success: '✓',
                error: '✗',
                warning: '⚠',
                info: 'ℹ'
            };

            const icon = icons[type] || '';
            toast.innerHTML = `
                <span style="font-size: 18px;">${icon}</span>
                <span>${message}</span>
            `;

            // 样式
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };

            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type] || colors.success};
                color: white;
                padding: 14px 20px;
                border-radius: 10px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            document.body.appendChild(toast);

            // 自动消失
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s, transform 0.3s';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };

        // 添加动画样式
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('✅ Toast提示系统已增强');
    }

    // 改进错误处理
    function improveErrorHandling() {
        // 捕获全局错误
        window.addEventListener('error', function(event) {
            console.error('全局错误:', event.error);
            if (event.error && event.error.message && event.error.message.includes('quickAnnotate')) {
                showToast('标注功能出错，请刷新页面重试', 'error');
            }
        });

        // 捕获Promise错误
        window.addEventListener('unhandledrejection', function(event) {
            console.error('未处理的Promise错误:', event.reason);
        });

        console.log('✅ 错误处理已改进');
    }

    // 添加快捷键支持
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + 数字键快速标注
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
                const categories = ['vocab', 'keypoint', 'difficulty', 'phrase'];
                const category = categories[parseInt(e.key) - 1];
                if (category && window.getSelection().toString().trim()) {
                    e.preventDefault();
                    if (window.quickAnnotate) {
                        window.quickAnnotate(category);
                    }
                }
            }
        });

        console.log('✅ 快捷键支持已添加 (Ctrl+1-4)');
    }

    // 启动修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 添加快捷键
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
    } else {
        setupKeyboardShortcuts();
    }

    console.log('🎉 快速标注修复脚本加载完成！');
})();
