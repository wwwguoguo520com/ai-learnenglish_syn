/**
 * 工具栏选项卡切换功能 v4.2.4
 * 用于优化 selectionToolbar 布局
 *
 * 使用说明：将此代码添加到 script.js 的 DOMContentLoaded 事件处理函数中
 */

// 工具栏选项卡切换
function initToolbarTabs() {
    const tabs = document.querySelectorAll('.toolbar-tab');
    const tabContents = document.querySelectorAll('.toolbar-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetTab = tab.dataset.tab;

            // 移除所有 active 状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 添加当前选中的 active 状态
            tab.classList.add('active');
            const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// 在 DOMContentLoaded 事件中调用
// document.addEventListener('DOMContentLoaded', () => {
//     initToolbarTabs();
// });

// 导出函数以便在 script.js 中使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initToolbarTabs };
}
