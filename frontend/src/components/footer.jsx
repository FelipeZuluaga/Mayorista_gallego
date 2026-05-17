import "../styles/footer.css";

const Footer = () => {
    return (
        <footer className="main-footer">
            <div className="footer-container">
                <div className="footer-info">
                    <p>© 2026 Mayorista gallego & Asociados. Todos los derechos reservados.</p>
                </div>
                <div className="footer-links">
                    {/* Cambiado span por etiqueta de enlace 'a' externa */}
                    <a 
                        href="https://novaforge-sa.netlify.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="footer-support-link"
                    >
                        Soporte Técnico
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;