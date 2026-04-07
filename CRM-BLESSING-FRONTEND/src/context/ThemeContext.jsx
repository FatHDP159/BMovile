import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('theme-dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('theme-dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleTheme = () => setDarkMode(v => !v);

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);