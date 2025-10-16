(function () {
    const STYLE_CONFIG = {
        circle: {
            borderStyle: 'round',
            borderColor: '#f97316'
        },
        underline: {
            underline: true,
            underlineOnly: true,
            underlineColor: '#2563eb'
        },
        dashed: {
            borderStyle: 'dashed',
            borderColor: '#0ea5e9'
        }
    };

    const MESSAGES = {
        circle: '已识别圈选并添加圆框',
        underline: '已识别划线并添加下划线',
        dashed: '已识别虚线并添加虚线样式'
    };

    const MIN_POINTS = 6;
    const MIN_SIZE = 8;

    const brush = {
        active: false,
        button: null,
        readingArea: null,
        canvas: null,
        ctx: null,
        stroke: null,
        pointerId: null,
        resizeObserver: null,
        previousUserSelect: '',
        hintShown: false
    };

    function bootstrap() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onDomReady);
        } else {
            onDomReady();
        }
    }

    function onDomReady() {
        if (window.appInitialized) {
            initialize();
        } else {
            window.addEventListener('appReady', initialize, { once: true });
        }
    }

    function initialize() {
        brush.readingArea = document.getElementById('readingArea');
        brush.button = document.getElementById('handwritingBrushBtn');

        if (!brush.readingArea || !brush.button || typeof window.createNewAnnotation !== 'function') {
            return;
        }

        ensureCategoryRegistered();
        setupCanvas();
        attachEvents();
    }

    function ensureCategoryRegistered() {
        if (!window.state || !Array.isArray(window.state.customCategories)) {
            return;
        }
        const exists = window.state.customCategories.some(cat => cat && cat.id === 'handwriting');
        if (!exists) {
            window.state.customCategories.push({ id: 'handwriting', label: '手写画笔', applyStyle: true });
        }
    }

    function setupCanvas() {
        if (brush.canvas) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'handwriting-overlay';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.display = 'none';
        brush.readingArea.appendChild(canvas);

        brush.canvas = canvas;
        brush.ctx = canvas.getContext('2d');

        updateCanvasSize();

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerCancel);
        canvas.addEventListener('pointerleave', handlePointerCancel);

        if (typeof ResizeObserver === 'function') {
            brush.resizeObserver = new ResizeObserver(updateCanvasSize);
            brush.resizeObserver.observe(brush.readingArea);
        }

        window.addEventListener('resize', updateCanvasSize);
    }

    function attachEvents() {
        brush.button.addEventListener('click', toggleBrush);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && brush.active) {
                deactivateBrush(true);
            }
        });
    }

    function toggleBrush() {
        if (brush.active) {
            deactivateBrush();
        } else {
            activateBrush();
        }
    }

    function activateBrush() {
        brush.active = true;
        updateCanvasSize();

        brush.canvas.style.display = 'block';
        brush.canvas.classList.add('active');

        if (brush.ctx) {
            brush.ctx.clearRect(0, 0, brush.canvas.width, brush.canvas.height);
            brush.ctx.lineJoin = 'round';
            brush.ctx.lineCap = 'round';
        }

        brush.button.classList.add('active');
        brush.button.setAttribute('aria-pressed', 'true');

        brush.previousUserSelect = brush.readingArea.style.userSelect || '';
        brush.readingArea.classList.add('handwriting-active');
        brush.readingArea.style.userSelect = 'none';

        if (!brush.hintShown) {
            showInfo('手写画笔已开启：圈选生成圆框，划线生成下划线，虚线生成虚线框。按 Esc 可退出。');
            brush.hintShown = true;
        }
    }

    function deactivateBrush(silent) {
        brush.active = false;

        if (brush.pointerId != null) {
            try {
                brush.canvas.releasePointerCapture(brush.pointerId);
            } catch (err) {
                console.warn('[handwriting] releasePointerCapture failed', err);
            }
        }

        brush.pointerId = null;
        brush.stroke = null;

        if (brush.ctx) {
            brush.ctx.clearRect(0, 0, brush.canvas.width, brush.canvas.height);
        }

        brush.canvas.classList.remove('active');
        brush.canvas.style.display = 'none';

        brush.button.classList.remove('active');
        brush.button.setAttribute('aria-pressed', 'false');

        brush.readingArea.classList.remove('handwriting-active');
        brush.readingArea.style.userSelect = brush.previousUserSelect;
        brush.previousUserSelect = '';

        if (!silent) {
            showInfo('手写画笔已关闭');
        }
    }

    function updateCanvasSize() {
        if (!brush.canvas || !brush.ctx) return;

        const width = brush.readingArea.clientWidth;
        const height = brush.readingArea.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.max(1, Math.round(width * dpr));
        const targetHeight = Math.max(1, Math.round(height * dpr));

        if (brush.canvas.width !== targetWidth || brush.canvas.height !== targetHeight) {
            brush.canvas.width = targetWidth;
            brush.canvas.height = targetHeight;
            brush.canvas.style.width = width + 'px';
            brush.canvas.style.height = height + 'px';
            brush.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            brush.ctx.lineJoin = 'round';
            brush.ctx.lineCap = 'round';
        }
    }

    function handlePointerDown(event) {
        if (!brush.active || !brush.canvas) return;
        if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

        event.preventDefault();
        updateCanvasSize();

        const rect = brush.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        const contentX = canvasX + brush.readingArea.scrollLeft;
        const contentY = canvasY + brush.readingArea.scrollTop;

        brush.stroke = {
            points: [{
                canvasX,
                canvasY,
                contentX,
                contentY,
                clientX: event.clientX,
                clientY: event.clientY,
                time: event.timeStamp
            }],
            pathLength: 0
        };
        brush.pointerId = event.pointerId;

        if (brush.ctx) {
            brush.ctx.clearRect(0, 0, brush.canvas.width, brush.canvas.height);
            brush.ctx.beginPath();
            brush.ctx.moveTo(canvasX, canvasY);
            brush.ctx.lineWidth = 3;
            brush.ctx.strokeStyle = 'rgba(79, 70, 229, 0.85)';
        }

        try {
            brush.canvas.setPointerCapture(event.pointerId);
        } catch (err) {
            console.warn('[handwriting] setPointerCapture failed', err);
        }
    }

    function handlePointerMove(event) {
        if (!brush.active || !brush.stroke || brush.pointerId !== event.pointerId) return;

        event.preventDefault();

        const rect = brush.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        const contentX = canvasX + brush.readingArea.scrollLeft;
        const contentY = canvasY + brush.readingArea.scrollTop;

        const stroke = brush.stroke;
        const last = stroke.points[stroke.points.length - 1];
        const dx = contentX - last.contentX;
        const dy = contentY - last.contentY;
        const segment = Math.hypot(dx, dy);
        if (segment > 0) {
            stroke.pathLength += segment;
        }

        stroke.points.push({
            canvasX,
            canvasY,
            contentX,
            contentY,
            clientX: event.clientX,
            clientY: event.clientY,
            time: event.timeStamp
        });

        if (brush.ctx) {
            brush.ctx.lineTo(canvasX, canvasY);
            brush.ctx.stroke();
        }
    }

    function handlePointerUp(event) {
        if (!brush.active || !brush.stroke || brush.pointerId !== event.pointerId) return;

        event.preventDefault();
        try {
            brush.canvas.releasePointerCapture(event.pointerId);
        } catch (err) {
            console.warn('[handwriting] releasePointerCapture failed', err);
        }
        finalizeStroke();
    }

    function handlePointerCancel(event) {
        if (!brush.stroke || brush.pointerId !== event.pointerId) return;

        event.preventDefault();
        try {
            brush.canvas.releasePointerCapture(event.pointerId);
        } catch (err) {
            console.warn('[handwriting] releasePointerCapture failed', err);
        }
        clearStroke();
    }

    function clearStroke() {
        brush.pointerId = null;
        brush.stroke = null;
        if (brush.ctx) {
            brush.ctx.clearRect(0, 0, brush.canvas.width, brush.canvas.height);
        }
    }

    function finalizeStroke() {
        const stroke = brush.stroke;
        clearStroke();

        if (!stroke || stroke.points.length < MIN_POINTS) {
            return;
        }

        const metrics = computeMetrics(stroke.points, stroke.pathLength);
        if (!metrics) return;

        const maxDimension = Math.max(metrics.bounds.width, metrics.bounds.height);
        if (maxDimension < MIN_SIZE) {
            showWarning('笔迹过短，未能识别');
            return;
        }

        const shape = classifyStroke(metrics);
        if (!shape) {
            showWarning('未能识别笔迹，请画更完整的圈或线');
            return;
        }

        const range = createRangeFromBounds(metrics.clientBounds, shape);
        if (!range) {
            showWarning('未定位到有效文本，请在文字附近操作');
            return;
        }

        trimRangeWhitespace(range);
        const selectedText = range.toString().trim();
        if (!selectedText) {
            showWarning('未选择到有效文本');
            return;
        }

        applyAnnotation(range, selectedText, shape);
        if (MESSAGES[shape]) {
            showSuccess(shape);
        }
    }

    
    function computeMetrics(points, totalLength) {
            if (!points.length) return null;
    
            let minContentX = Infinity;
            let minContentY = Infinity;
            let maxContentX = -Infinity;
            let maxContentY = -Infinity;
            let minClientX = Infinity;
            let minClientY = Infinity;
            let maxClientX = -Infinity;
            let maxClientY = -Infinity;
            let sumX = 0;
            let sumY = 0;
            let gapCount = 0;
    
            const deviations = [];
            let deviationSumSq = 0;
    
            for (let i = 0; i < points.length; i += 1) {
                const point = points[i];
                minContentX = Math.min(minContentX, point.contentX);
                minContentY = Math.min(minContentY, point.contentY);
                maxContentX = Math.max(maxContentX, point.contentX);
                maxContentY = Math.max(maxContentY, point.contentY);
    
                minClientX = Math.min(minClientX, point.clientX);
                minClientY = Math.min(minClientY, point.clientY);
                maxClientX = Math.max(maxClientX, point.clientX);
                maxClientY = Math.max(maxClientY, point.clientY);
    
                sumX += point.contentX;
                sumY += point.contentY;
            }
    
            const width = maxContentX - minContentX;
            const height = maxContentY - minContentY;
            const strokeSize = Math.max(width, height);
            const gapThreshold = Math.max(24, strokeSize * 0.35);
    
            for (let i = 1; i < points.length; i += 1) {
                const prev = points[i - 1];
                const point = points[i];
                const segment = Math.hypot(point.contentX - prev.contentX, point.contentY - prev.contentY);
                if (segment > gapThreshold) {
                    gapCount += 1;
                }
            }
    
            const startPoint = points[0];
            const endPoint = points[points.length - 1];
            const directDistance = Math.hypot(endPoint.contentX - startPoint.contentX, endPoint.contentY - startPoint.contentY);
    
            const meanX = sumX / points.length;
            const meanY = sumY / points.length;
    
            let xx = 0;
            let xy = 0;
            let yy = 0;
    
            for (const point of points) {
                const dx = point.contentX - meanX;
                const dy = point.contentY - meanY;
                xx += dx * dx;
                xy += dx * dy;
                yy += dy * dy;
            }
    
            let angle = 0;
            if (xy !== 0 || xx !== yy) {
                angle = 0.5 * Math.atan2(2 * xy, xx - yy);
            }
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
    
            let maxDeviation = 0;
            for (const point of points) {
                const dx = point.contentX - meanX;
                const dy = point.contentY - meanY;
                const perpendicular = (-dx * sin) + (dy * cos);
                const deviation = Math.abs(perpendicular);
                maxDeviation = Math.max(maxDeviation, deviation);
                deviations.push(deviation);
                deviationSumSq += deviation * deviation;
            }
    
            let deviation90 = 0;
            let deviationRms = 0;
            if (deviations.length > 0) {
                const sortedDeviations = deviations.slice().sort((a, b) => a - b);
                const ninetyIndex = min(sortedDeviations.length - 1, int(sortedDeviations.length * 0.9));
                deviation90 = sortedDeviations[ninetyIndex];
                deviationRms = Math.sqrt(deviationSumSq / sortedDeviations.length);
            }
    
            return {
                bounds: {
                    minX: minContentX,
                    minY: minContentY,
                    maxX: maxContentX,
                    maxY: maxContentY,
                    width,
                    height
                },
                clientBounds: {
                    left: minClientX,
                    top: minClientY,
                    right: maxClientX,
                    bottom: maxClientY
                },
                pathLength: totalLength,
                directDistance,
                startEndDistance: Math.hypot(endPoint.contentX - startPoint.contentX, endPoint.contentY - startPoint.contentY),
                maxDeviation,
                deviation90,
                deviationRms,
                gapCount
            };
        }
    
    function classifyStroke(metrics) {
            const width = metrics.bounds.width;
            const height = metrics.bounds.height;
            const maxDimension = Math.max(width, height);
            const minDimension = Math.min(width, height);
            const startEnd = metrics.startEndDistance;
            const pathLength = metrics.pathLength;

            if (!maxDimension || !pathLength) {
                return null;
            }

            const aspectRatio = maxDimension === 0 ? 0 : minDimension / maxDimension;
            // 降低闭合阈值，支持更小的圆圈（从16降到8）
            const closureThreshold = Math.max(8, maxDimension * 0.5);
            // 降低最小路径长度要求，支持单字符小圆圈（从1.8降到1.4）
            const minimumLoopLength = maxDimension * 1.4;
            const perimeterEstimate = Math.PI * ((width + height) / 2 || maxDimension);
            const circleScore = perimeterEstimate ? pathLength / perimeterEstimate : 0;

            // 降低长宽比要求，放宽圆圈识别（从0.45降到0.35）
            // 扩大圆形得分范围，更容易识别不规则的小圆圈（从0.5-1.85扩大到0.4-2.2）
            if (startEnd <= closureThreshold && aspectRatio > 0.35 && pathLength >= minimumLoopLength) {
                if (circleScore > 0.4 && circleScore < 2.2) {
                    return 'circle';
                }
            }
    
            if (metrics.directDistance > 0) {
                const lengthRatio = pathLength / metrics.directDistance;
                const baseDeviationLimit = Math.max(6, metrics.directDistance * 0.12);
                const relaxedDeviationLimit = Math.max(8, metrics.directDistance * 0.18);
                const typicalDeviation = metrics.deviation90 != null ? metrics.deviation90 : metrics.maxDeviation;
                const worstDeviation = metrics.maxDeviation;
                const overallDeviation = metrics.deviationRms != null ? metrics.deviationRms : typicalDeviation;
    
                const straightEnough = typicalDeviation <= baseDeviationLimit;
                const acceptableWithNoise = typicalDeviation <= relaxedDeviationLimit &&
                    overallDeviation <= relaxedDeviationLimit &&
                    worstDeviation <= relaxedDeviationLimit * 1.35;
    
                if ((straightEnough || acceptableWithNoise) && lengthRatio <= 2.6) {
                    if (lengthRatio >= 1.7 || metrics.gapCount >= 2) {
                        return 'dashed';
                    }
                    return 'underline';
                }
            }
    
            return null;
        }
    function createRangeFromBounds(bounds, shape) {
        if (!bounds) return null;

        const readingRect = brush.readingArea.getBoundingClientRect();
        const padding = shape === 'underline' ? 10 : 6;
        const verticalExtra = shape === 'underline' ? 18 : 6;

        const left = clamp(bounds.left - padding, readingRect.left + 1, readingRect.right - 1);
        const right = clamp(bounds.right + padding, readingRect.left + 1, readingRect.right - 1);
        const top = clamp(bounds.top - verticalExtra, readingRect.top + 1, readingRect.bottom - 1);
        const bottom = clamp(bounds.bottom + padding, readingRect.top + 1, readingRect.bottom - 1);

        const startRange = getCaretRange(left, top);
        const endRange = getCaretRange(right, bottom);
        if (!startRange || !endRange) {
            return null;
        }

        const range = document.createRange();
        try {
            range.setStart(startRange.startContainer, startRange.startOffset);
            range.setEnd(endRange.startContainer, endRange.startOffset);
        } catch (err) {
            console.warn('[handwriting] Failed to construct range', err);
            return null;
        }

        if (!brush.readingArea.contains(range.commonAncestorContainer)) {
            return null;
        }

        return range;
    }

    function getCaretRange(x, y) {
        if (document.caretRangeFromPoint) {
            try {
                return document.caretRangeFromPoint(x, y);
            } catch (err) {
                console.warn('[handwriting] caretRangeFromPoint error', err);
            }
        }

        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos) {
                const range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
                return range;
            }
        }

        return null;
    }

    function trimRangeWhitespace(range) {
        if (!range) return;

        while (!range.collapsed) {
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                const text = range.startContainer.textContent || '';
                let offset = range.startOffset;
                while (offset < text.length && /\s/.test(text.charAt(offset))) {
                    offset += 1;
                }
                if (offset === range.startOffset) break;
                range.setStart(range.startContainer, offset);
                continue;
            }
            const startNode = range.startContainer.childNodes[range.startOffset];
            if (!startNode) break;
            if (startNode.nodeType === Node.TEXT_NODE) {
                if (/^\s*$/.test(startNode.textContent || '')) {
                    range.setStart(range.startContainer, range.startOffset + 1);
                    continue;
                }
                range.setStart(startNode, 0);
                continue;
            }
            if (startNode.nodeType === Node.ELEMENT_NODE && startNode.childNodes.length > 0) {
                range.setStart(startNode, 0);
                continue;
            }
            break;
        }

        while (!range.collapsed) {
            if (range.endContainer.nodeType === Node.TEXT_NODE) {
                const text = range.endContainer.textContent || '';
                let offset = range.endOffset;
                while (offset > 0 && /\s/.test(text.charAt(offset - 1))) {
                    offset -= 1;
                }
                if (offset === range.endOffset) break;
                range.setEnd(range.endContainer, offset);
                continue;
            }
            const endIndex = range.endOffset - 1;
            if (endIndex < 0) break;
            const endNode = range.endContainer.childNodes[endIndex];
            if (!endNode) break;
            if (endNode.nodeType === Node.TEXT_NODE) {
                if (/^\s*$/.test(endNode.textContent || '')) {
                    range.setEnd(range.endContainer, endIndex);
                    continue;
                }
                range.setEnd(endNode, endNode.textContent.length);
                continue;
            }
            if (endNode.nodeType === Node.ELEMENT_NODE && endNode.childNodes.length > 0) {
                range.setEnd(endNode, endNode.childNodes.length);
                continue;
            }
            break;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function applyAnnotation(range, text, shape) {
        const style = STYLE_CONFIG[shape];
        if (!style) return;

        window.createNewAnnotation({
            text,
            category: 'handwriting',
            customCategory: '',
            color: null,
            underline: Boolean(style.underline),
            bold: false,
            strikethrough: false,
            borderStyle: style.borderStyle || 'none',
            emoji: '',
            showNoteBelow: false,
            customBgColor: '',
            fontFamily: '',
            underlineOnly: Boolean(style.underlineOnly),
            textColor: 'default',
            fontSize: 'medium',
            note: '',
            tags: [],
            range,
            dashed: false,
            slash: false,
            customTextColor: style.customTextColor || null,
            underlineColor: style.underlineColor || null,
            borderColor: style.borderColor || null
        });
    }

    function showSuccess(shape) {
        if (typeof showToast === 'function') {
            showToast(MESSAGES[shape] || '标注已应用', 'success');
        }
    }

    function showInfo(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        }
    }

    function showWarning(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'warning');
        }
    }

    bootstrap();
})();
