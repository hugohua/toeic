import React from 'react';

function DetailSection({ title, children, htmlContent, className = '' }) {
    return (
        <div className={`detail-section ${className}`}>
            {title && <h3 className="section-title">{title}</h3>}
            {htmlContent ? (
                <div
                    className="section-content"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            ) : (
                <div className="section-content">{children}</div>
            )}
        </div>
    );
}

export default DetailSection;
