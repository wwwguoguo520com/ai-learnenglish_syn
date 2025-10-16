/**
 * 快速标注模式增强脚本 v4.3
 * 实现正确的快速标注模式流程
 */

(function() {
    'use strict';

    console.log('🚀 加载快速标注模式增强脚本...');

    let quickMode = false; // 快速标注模式开关
    let currentFormat = {
        color: 'honey',
        bold: false,
        underline: false,
        strikethrough: false,
        borderStyle: 'none',
        emoji: '',
        category: 'vocab'
    };

    function init() {
        if (typeof state === 'undefined' || typeof dom === 'undefined') {
            setTimeout(init, 100);
            return;
        }

        console.log('✅ 开始设置快速标注模式');
        setupQuickModeToggle();
        setupFormatToolbar();
        overrideSelectionHandler();
        console.log('✅ 快速标注模式设置完成');
    }

    // 设置快速模式切换
    function setupQuickModeToggle() {
        // 查找快速标注按钮（格式工具栏中的）
        const quickBtn = document.getElementById('formatApplyBtn');

        if (quickBtn) {
            // 移除旧的事件监听
            const newBtn = quickBtn.cloneNode(true);
            quickBtn.parentNode.replaceChild(newBtn, quickBtn);

            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleQuickMode();
            });

            console.log('✅ 快速标注模式按钮已绑定');
        } else {
            console.warn('⚠️ 未找到formatApplyBtn');
        }
    }

    // 切换快速标注模式
    function toggleQuickMode() {
        quickMode = !quickMode;
        updateModeUI();

        if (quickMode) {
            // 进入快速模式
            window.showToast('✓ 快速标注模式已开启', 'success');
            console.log('✅ 进入快速标注模式');

            // 隐藏标注对话框
            if (dom && dom.selectionToolbar) {
                dom.selectionToolbar.classList.add('hidden');
            }

            // 读取当前格式设置
            readCurrentFormat();
        } else {
            // 退出快速模式
            window.showToast('✓ 快速标注模式已关闭', 'info');
            console.log('📌 退出快速标注模式');
        }
    }

    // 更新模式UI
    function updateModeUI() {
        const btn = document.getElementById('formatApplyBtn');
        if (btn) {
            if (quickMode) {
                btn.classList.add('active');
                btn.textContent = '退出快速标注';
                btn.style.background = '#0f172a';
                btn.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.2)';
            } else {
                btn.classList.remove('active');
                btn.textContent = '快速标注';
                btn.style.background = '';
                btn.style.boxShadow = '';
            }
        }
    }

    // 设置格式工具栏监听
    function setupFormatToolbar() {
        // 监听颜色按钮
        const colorButtons = document.querySelectorAll('.formatting-toolbar [data-color]');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentFormat.color = this.dataset.color;

                // 更新选中状态
                colorButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                if (quickMode) {
                    window.showToast(`颜色已切换: ${getColorName(currentFormat.color)}`, 'info');
                }
            });
        });

        // 监听加粗按钮
        const boldBtn = document.getElementById('formatBoldToggle');
        if (boldBtn) {
            boldBtn.addEventListener('click', function() {
                currentFormat.bold = this.classList.toggle('active');
                if (quickMode) {
                    window.showToast(currentFormat.bold ? '✓ 加粗已开启' : '✗ 加粗已关闭', 'info');
                }
            });
        }

        // 监听下划线按钮
        const underlineBtn = document.getElementById('formatUnderlineToggle');
        if (underlineBtn) {
            underlineBtn.addEventListener('click', function() {
                currentFormat.underline = this.classList.toggle('active');
                if (quickMode) {
                    window.showToast(currentFormat.underline ? '✓ 下划线已开启' : '✗ 下划线已关闭', 'info');
                }
            });
        }

        // 监听删除线按钮
        const strikeBtn = document.getElementById('formatStrikethroughToggle');
        if (strikeBtn) {
            strikeBtn.addEventListener('click', function() {
                currentFormat.strikethrough = this.classList.toggle('active');
                if (quickMode) {
                    window.showToast(currentFormat.strikethrough ? '✓ 删除线已开启' : '✗ 删除线已关闭', 'info');
                }
            });
        }

        // 监听边框按钮
        const borderButtons = document.querySelectorAll('.format-border-btn');
        borderButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentFormat.borderStyle = this.dataset.border;
                borderButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                if (quickMode) {
                    const borderNames = {none: '无', square: '方框', round: '圆框', dashed: '虚线'};
                    window.showToast(`边框: ${borderNames[currentFormat.borderStyle]}`, 'info');
                }
            });
        });

        // 监听Emoji按钮
        const emojiButtons = document.querySelectorAll('.format-emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentFormat.emoji = this.dataset.emoji;
                emojiButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                if (quickMode && currentFormat.emoji) {
                    window.showToast(`标记: ${currentFormat.emoji}`, 'info');
                }
            });
        });

        console.log('✅ 格式工具栏监听已设置');
    }

    // 读取当前格式设置
    function readCurrentFormat() {
        // 读取选中的颜色
        const activeColor = document.querySelector('.formatting-toolbar [data-color].active');
        if (activeColor) {
            currentFormat.color = activeColor.dataset.color;
        }

        // 读取文本样式
        currentFormat.bold = document.getElementById('formatBoldToggle')?.classList.contains('active') || false;
        currentFormat.underline = document.getElementById('formatUnderlineToggle')?.classList.contains('active') || false;
        currentFormat.strikethrough = document.getElementById('formatStrikethroughToggle')?.classList.contains('active') || false;

        // 读取边框
        const activeBorder = document.querySelector('.format-border-btn.active');
        if (activeBorder) {
            currentFormat.borderStyle = activeBorder.dataset.border;
        }

        // 读取Emoji
        const activeEmoji = document.querySelector('.format-emoji-btn.active');
        if (activeEmoji) {
            currentFormat.emoji = activeEmoji.dataset.emoji;
        }

        console.log('📋 当前格式:', currentFormat);
    }

    // 重写选择处理器
    function overrideSelectionHandler() {
        // 拦截原有的handleTextSelection
        const readingArea = document.getElementById('readingArea');
        if (!readingArea) return;

        readingArea.addEventListener('mouseup', function(e) {
            if (!quickMode) return;

            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();

                if (!selectedText) return;

                const range = selection.getRangeAt(0);
                if (!readingArea.contains(range.commonAncestorContainer)) return;

                // 快速模式下自动标注
                applyQuickAnnotation(range, selectedText);
            }, 10);
        });

        console.log('✅ 选择处理器已重写');
    }

    // 快速标注应用
    function applyQuickAnnotation(range, text) {
        try {
            console.log('⚡ 快速标注:', text);

            // 检查是否跨段落
            const startPara = range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer.parentElement.closest('p')
                : range.startContainer.closest('p');
            const endPara = range.endContainer.nodeType === Node.TEXT_NODE
                ? range.endContainer.parentElement.closest('p')
                : range.endContainer.closest('p');

            if (!startPara || startPara !== endPara) {
                window.showToast('⚠️ 不支持跨段落标注', 'warning');
                window.getSelection().removeAllRanges();
                return;
            }

            // 检查是否包含已有标注
            const fragment = range.cloneContents();
            if (fragment.querySelector && fragment.querySelector('.highlight')) {
                window.showToast('⚠️ 选区包含已有标注', 'warning');
                window.getSelection().removeAllRanges();
                return;
            }

            // 创建标注
            const annotation = {
                id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: text,
                category: currentFormat.category,
                customCategory: '',
                color: currentFormat.color,
                bold: currentFormat.bold,
                underline: currentFormat.underline,
                strikethrough: currentFormat.strikethrough,
                borderStyle: currentFormat.borderStyle,
                emoji: currentFormat.emoji,
                note: '',
                tags: [],
                timestamp: new Date().toISOString(),
                showNoteBelow: false
            };

            // 应用高亮
            const span = document.createElement('span');
            span.className = 'highlight';
            span.dataset.id = annotation.id;
            span.dataset.category = annotation.category;
            span.dataset.color = annotation.color;
            if (annotation.bold) span.dataset.bold = 'true';
            if (annotation.underline) span.dataset.underline = 'true';
            if (annotation.strikethrough) span.dataset.strikethrough = 'true';
            if (annotation.borderStyle && annotation.borderStyle !== 'none') {
                span.dataset.border = annotation.borderStyle;
            }
            if (annotation.emoji) span.dataset.emoji = annotation.emoji;

            range.surroundContents(span);

            // 保存标注
            if (typeof state !== 'undefined') {
                state.annotations.push(annotation);

                if (typeof persistState === 'function') {
                    persistState();
                }

                if (typeof renderAnnotationsList === 'function') {
                    renderAnnotationsList();
                }
            }

            // 清除选择
            window.getSelection().removeAllRanges();

            // 提示
            window.showToast('✓ 已快速标注', 'success');

        } catch (error) {
            console.error('❌ 快速标注失败:', error);
            window.showToast('❌ 标注失败: ' + error.message, 'error');
            window.getSelection().removeAllRanges();
        }
    }

    // 颜色名称
    function getColorName(color) {
        const names = {
            honey: '蜜糖色',
            mint: '薄荷色',
            sky: '天空色',
            orchid: '兰花色',
            sunset: '落日色'
        };
        return names[color] || color;
    }

    // 快捷键支持
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Q 切换快速模式
        if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
            e.preventDefault();
            toggleQuickMode();
        }

        // Esc 退出快速模式
        if (e.key === 'Escape' && quickMode) {
            toggleQuickMode();
        }

        // 在快速模式下切换颜色
        if (quickMode && (e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const colors = ['honey', 'mint', 'sky', 'orchid', 'sunset'];
            const colorIndex = parseInt(e.key) - 1;
            currentFormat.color = colors[colorIndex];

            // 更新UI
            const colorButtons = document.querySelectorAll('.formatting-toolbar [data-color]');
            colorButtons.forEach((btn, idx) => {
                btn.classList.toggle('active', idx === colorIndex);
            });

            window.showToast(`颜色: ${getColorName(currentFormat.color)}`, 'info');
        }

        // Ctrl+B 切换加粗
        if (quickMode && (e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            currentFormat.bold = !currentFormat.bold;
            const boldBtn = document.getElementById('formatBoldToggle');
            if (boldBtn) {
                boldBtn.classList.toggle('active', currentFormat.bold);
            }
            window.showToast(currentFormat.bold ? '✓ 加粗' : '✗ 取消加粗', 'info');
        }

        // Ctrl+U 切换下划线
        if (quickMode && (e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            currentFormat.underline = !currentFormat.underline;
            const underlineBtn = document.getElementById('formatUnderlineToggle');
            if (underlineBtn) {
                underlineBtn.classList.toggle('active', currentFormat.underline);
            }
            window.showToast(currentFormat.underline ? '✓ 下划线' : '✗ 取消下划线', 'info');
        }
    });

    // 导出函数
    window.toggleQuickMode = toggleQuickMode;
    window.isQuickMode = () => quickMode;

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('🎉 快速标注模式增强脚本加载完成！');
})();
