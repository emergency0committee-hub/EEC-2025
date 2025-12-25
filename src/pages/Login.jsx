import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { LANGS_EN as LANGS } from "../i18n/strings.js";
import { supabase } from "../lib/supabase.js";

const ROLE_OPTIONS = {
  EN: [
    {
      value: "student",
      label: "Student",
      description: "Access practice tests, class materials, and track your results.",
    },
    {
      value: "educator",
      label: "Educator",
      description: "Create classes, assign quizzes, and review student performance.",
    },
  ],
  FR: [
    {
      value: "student",
      label: "\xc9tudiant",
      description: "Acc\xe9dez aux tests d'entra\xeenement, aux supports de cours et suivez vos r\xe9sultats.",
    },
    {
      value: "educator",
      label: "Enseignant",
      description: "Cr\xe9ez des classes, assignez des devoirs et analysez les performances des \xe9l\xe8ves.",
    },
  ],
};

const SIGNUP_SCHOOL_OPTIONS = [
  { value: "", label: "Select school" },
  { value: "Al - Jinan International School", label: "Al - Jinan International School" },
  { value: "Azm school", label: "Azm school" },
  { value: "Canada Educational Center", label: "Canada Educational Center" },
  { value: "Dar En Nour - Btouratige", label: "Dar En Nour - Btouratige" },
  { value: "EEC", label: "EEC" },
  { value: "Ecole Saint Joseph - Miniara", label: "Ecole Saint Joseph - Miniara" },
  { value: "Saints Coeurs - Andket", label: "Saints Coeurs - Andket" },
  { value: "Sir El Dinniyeh Secondary Public School", label: "Sir El Dinniyeh Secondary Public School" },
];

const SIGNUP_GRADE_OPTIONS = [
  { value: "", label: "Select grade" },
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

const LOGIN_COPY = {
  EN: {
    isRTL: false,
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signInSubtitle: "Enter your credentials to continue.",
    signUpSubtitle: "Create an account to access results.",
    roleSelectHeading: "Choose an account type",
    roleSelectBody: "Tell us if you're signing up as a student or an educator.",
    backToSignIn: "Back to sign in",
    signingUpAsLabel: "Signing up as",
    changeRole: "Change role",
    studentRole: "Student",
    educatorRole: "Educator",
    emailOrUsername: "Email or Username",
    emailOrUsernamePlaceholder: "Enter your email or username",
    schoolLabel: "School",
    schoolPlaceholder: "Your school",
    classLabel: "Class",
    classPlaceholder: "e.g., Grade 11",
    certificationLabel: "University Certification",
    certificationPlaceholder: "e.g., M.Ed., Teaching License #12345",
    usernameLabel: "Username",
    usernamePlaceholder: "Choose a username",
    phoneLabel: "Phone",
    phonePlaceholder: "e.g., 555 123 4567",
    loginIdRequired: "Email or username is required",
    loginIdInvalid: "Please enter a valid email address or username",
    usernameRequired: "Username is required",
    usernameInvalid: "Usernames must be 3-30 characters (letters, digits, _ - .)",
    accountTypeRequired: "Please choose Student or Educator",
    schoolRequired: "School is required",
    classRequired: "Class is required",
    certificationRequired: "Certification is required",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Please enter a valid phone number",
    firstName: "First Name",
    enterFirstName: "e.g., Amina",
    lastName: "Last Name",
    enterLastName: "e.g., Khalil",
    fullName: "Full Name",
    enterFullName: "e.g., Amina Khalil",
    email: "Email",
    enterEmail: "e.g., name@example.com",
    password: "Password",
    enterPassword: "Enter your password",
    confirmPassword: "Confirm Password",
    confirmYourPassword: "Re-enter your password",
    signIn: "Sign In",
    signUp: "Sign Up",
    signingIn: "Signing in...",
    signingUp: "Signing up...",
    backToHome: "Back to Home",
    alreadyHaveAccount: "Already have an account? Sign in",
    dontHaveAccount: "Don't have an account? Sign up",
    emailRequired: "Email is required",
    emailInvalid: "Please enter a valid email",
    passwordRequired: "Password is required",
    passwordTooShort: "Password must be at least 6 characters",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    nameRequired: "Full name is required",
    confirmPasswordRequired: "Please confirm your password",
    passwordsDontMatch: "Passwords do not match",
    showPassword: "Show password",
    hidePassword: "Hide password",
    showConfirmPassword: "Show confirmation password",
    hideConfirmPassword: "Hide confirmation password",
    confirmEmailNotice: "Check your email to confirm your account, then sign in.",
  },
  AR: {
    isRTL: true,
    signInTitle: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    signUpTitle: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628",
    welcomeBack: "\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0639\u0648\u062f\u062a\u0643",
    createAccount: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f",
    signInSubtitle: "\u0623\u062f\u062e\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0639\u062a\u0645\u0627\u062f\u0643 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.",
    signUpSubtitle: "\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0627\u064b \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u062a\u0627\u0626\u062c.",
    roleSelectHeading: "\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628",
    roleSelectBody: "\u062d\u062f\u062f \u0625\u0630\u0627 \u0643\u0646\u062a \u062a\u0633\u062c\u0651\u0644 \u0643\u0637\u0627\u0644\u0628 \u0623\u0648 \u0643\u0645\u0639\u0644\u0645.",
    backToSignIn: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    signingUpAsLabel: "\u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0643\u0640",
    changeRole: "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0646\u0648\u0639",
    studentRole: "\u0637\u0627\u0644\u0628",
    educatorRole: "\u0645\u0639\u0644\u0645",
    emailOrUsername: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    emailOrUsernamePlaceholder: "\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    schoolLabel: "\u0627\u0644\u0645\u062f\u0631\u0633\u0629",
    schoolPlaceholder: "\u0627\u0633\u0645 \u0645\u062f\u0631\u0633\u062a\u0643",
    classLabel: "\u0627\u0644\u0635\u0641",
    classPlaceholder: "\u0645\u062b\u0627\u0644: \u0627\u0644\u0635\u0641 \u0627\u0644\u062d\u0627\u062f\u064a \u0639\u0634\u0631",
    certificationLabel: "\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u062c\u0627\u0645\u0639\u064a",
    certificationPlaceholder: "\u0645\u062b\u0627\u0644: \u0645\u0627\u062c\u0633\u062a\u064a\u0631 \u062a\u0631\u0628\u064a\u0629\u060c \u0631\u0642\u0645 \u0631\u062e\u0635\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0633",
    usernameLabel: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    usernamePlaceholder: "\u0627\u062e\u062a\u0631 \u0627\u0633\u0645 \u0645\u0633\u062a\u062e\u062f\u0645",
    phoneLabel: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641",
    phonePlaceholder: "\u0645\u062b\u0627\u0644: 555 123 4567",
    loginIdRequired: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0637\u0644\u0648\u0628",
    loginIdInvalid: "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u0627\u0644\u062d \u0623\u0648 \u0627\u0633\u0645 \u0645\u0633\u062a\u062e\u062f\u0645 \u0635\u0627\u0644\u062d",
    usernameRequired: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0637\u0644\u0648\u0628",
    usernameInvalid: "\u064a\u062c\u0628 \u0623\u0646 \u064a\u062a\u0643\u0648\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0646 3 \u0625\u0644\u0649 30 \u062d\u0631\u0641\u0627\u064b \u0623\u0648 \u0623\u0631\u0642\u0627\u0645\u0627\u064b \u0623\u0648 \u0627\u0644\u0631\u0645\u0648\u0632 _ - .",
    accountTypeRequired: "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0637\u0627\u0644\u0628 \u0623\u0648 \u0645\u0639\u0644\u0645",
    schoolRequired: "\u0627\u0633\u0645 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0645\u0637\u0644\u0648\u0628",
    classRequired: "\u0627\u0633\u0645 \u0627\u0644\u0635\u0641 \u0645\u0637\u0644\u0648\u0628",
    certificationRequired: "\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0645\u0637\u0644\u0648\u0628",
    phoneRequired: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641 \u0645\u0637\u0644\u0648\u0628",
    phoneInvalid: "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641 \u0635\u0627\u0644\u062d",
    firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
    enterFirstName: "\u0645\u062b\u0627\u0644: \u0622\u0645\u0646\u0629",
    lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
    enterLastName: "\u0645\u062b\u0627\u0644: \u062e\u0644\u064a\u0644",
    fullName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
    enterFullName: "\u0645\u062b\u0627\u0644: \u0622\u0645\u0646\u0629 \u062e\u0644\u064a\u0644",
    email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
    enterEmail: "\u0645\u062b\u0627\u0644: name@example.com",
    password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    enterPassword: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    confirmPassword: "\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    confirmYourPassword: "\u0623\u0639\u062f \u0625\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    signIn: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    signUp: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628",
    signingIn: "\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...",
    signingUp: "\u062c\u0627\u0631\u064d \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628...",
    backToHome: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
    alreadyHaveAccount: "\u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061f \u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    dontHaveAccount: "\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628\u061f \u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0627\u064b",
    emailRequired: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0645\u0637\u0644\u0648\u0628",
    emailInvalid: "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u0627\u0644\u062d",
    passwordRequired: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629",
    passwordTooShort: "\u064a\u062c\u0628 \u0623\u0644\u0627 \u062a\u0642\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0646 6 \u0623\u062d\u0631\u0641",
    firstNameRequired: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0645\u0637\u0644\u0648\u0628",
    lastNameRequired: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0645\u0637\u0644\u0648\u0628",
    nameRequired: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628",
    confirmPasswordRequired: "\u064a\u0631\u062c\u0649 \u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    passwordsDontMatch: "\u0643\u0644\u0645\u062a\u0627 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u062a\u064a\u0646",
    showPassword: "\u0625\u0638\u0647\u0627\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    hidePassword: "\u0625\u062e\u0641\u0627\u0621 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    showConfirmPassword: "\u0625\u0638\u0647\u0627\u0631 \u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    hideConfirmPassword: "\u0625\u062e\u0641\u0627\u0621 \u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    confirmEmailNotice: "\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0633\u0627\u0628 \u062b\u0645 \u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.",
  },
  FR: {
    isRTL: false,
    signInTitle: "Connexion",
    signUpTitle: "Cr\xe9er un compte",
    welcomeBack: "Heureux de vous revoir",
    createAccount: "Cr\xe9er un compte",
    signInSubtitle: "Entrez vos identifiants pour continuer.",
    signUpSubtitle: "Cr\xe9ez un compte pour acc\xe9der aux r\xe9sultats.",
    roleSelectHeading: "Choisissez un type de compte",
    roleSelectBody: "Indiquez si vous vous inscrivez en tant qu'\xe9tudiant ou enseignant.",
    backToSignIn: "Retour \xe0 la connexion",
    signingUpAsLabel: "Inscription en tant que",
    changeRole: "Changer de type",
    studentRole: "\xc9tudiant",
    educatorRole: "Enseignant",
    emailOrUsername: "E-mail ou nom d'utilisateur",
    emailOrUsernamePlaceholder: "Saisissez votre e-mail ou votre nom d'utilisateur",
    schoolLabel: "\xc9tablissement",
    schoolPlaceholder: "Votre \xe9tablissement",
    classLabel: "Classe",
    classPlaceholder: "ex. Terminale",
    certificationLabel: "Certification universitaire",
    certificationPlaceholder: "ex. M.Ed., Num\xe9ro de licence d'enseignement",
    usernameLabel: "Nom d'utilisateur",
    usernamePlaceholder: "Choisissez un nom d'utilisateur",
    phoneLabel: "T\xe9l\xe9phone",
    phonePlaceholder: "ex. 06 12 34 56 78",
    loginIdRequired: "L'e-mail ou le nom d'utilisateur est obligatoire",
    loginIdInvalid: "Veuillez saisir une adresse e-mail ou un nom d'utilisateur valide",
    usernameRequired: "Le nom d'utilisateur est obligatoire",
    usernameInvalid: "Le nom d'utilisateur doit comporter entre 3 et 30 caract\xe8res (lettres, chiffres, _ - .)",
    accountTypeRequired: "Veuillez choisir \xc9tudiant ou Enseignant",
    schoolRequired: "L'\xe9tablissement est obligatoire",
    classRequired: "La classe est obligatoire",
    certificationRequired: "La certification universitaire est obligatoire",
    phoneRequired: "Le num\xe9ro de t\xe9l\xe9phone est obligatoire",
    phoneInvalid: "Veuillez saisir un num\xe9ro de t\xe9l\xe9phone valide",
    firstName: "Pr\xe9nom",
    enterFirstName: "ex. Amina",
    lastName: "Nom de famille",
    enterLastName: "ex. Khalil",
    fullName: "Nom complet",
    enterFullName: "ex. Amina Khalil",
    email: "E-mail",
    enterEmail: "ex. nom@example.com",
    password: "Mot de passe",
    enterPassword: "Saisissez votre mot de passe",
    confirmPassword: "Confirmez le mot de passe",
    confirmYourPassword: "Saisissez de nouveau votre mot de passe",
    signIn: "Connexion",
    signUp: "Inscription",
    signingIn: "Connexion...",
    signingUp: "Cr\xe9ation du compte...",
    backToHome: "Retour \xe0 l'accueil",
    alreadyHaveAccount: "Vous avez d\xe9j\xe0 un compte ? Connectez-vous",
    dontHaveAccount: "Vous n'avez pas de compte ? Inscrivez-vous",
    emailRequired: "L'adresse e-mail est obligatoire",
    emailInvalid: "Veuillez saisir une adresse e-mail valide",
    passwordRequired: "Le mot de passe est obligatoire",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caract\xe8res",
    firstNameRequired: "Le pr\xe9nom est obligatoire",
    lastNameRequired: "Le nom de famille est obligatoire",
    nameRequired: "Le nom complet est obligatoire",
    confirmPasswordRequired: "Veuillez confirmer votre mot de passe",
    passwordsDontMatch: "Les mots de passe ne correspondent pas",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    showConfirmPassword: "Afficher la confirmation du mot de passe",
    hideConfirmPassword: "Masquer la confirmation du mot de passe",
    confirmEmailNotice: "V\xe9rifiez votre e-mail pour confirmer votre compte, puis connectez-vous.",
  },
};

function EyeIcon({ size = 18, stroke = "#4b5563" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.458 12C3.732 7.943 7.522 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.542-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 18, stroke = "#4b5563" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
      <path d="M7.11 7.11C4.88 8.57 3.34 10.64 2.46 13c1.73 4.5 6 7 9.54 7 1.52 0 3.02-.36 4.38-1.03" />
      <path d="M14.53 5.47C13.72 5.17 12.87 5 12 5 8.46 5 4.19 7.5 2.46 12a12.2 12.2 0 0 0 2.29 3.62" />
      <path d="M17.94 6.06A11.9 11.9 0 0 1 21.54 12a12.16 12.16 0 0 1-2.53 3.66" />
    </svg>
  );
}

export default function Login({ onNavigate, lang = "EN", setLang }) {
  Login.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const copy = LOGIN_COPY[lang] || LOGIN_COPY.EN;
  const roleOptions = ROLE_OPTIONS[lang] || ROLE_OPTIONS.EN;
  const isRTL = copy.isRTL;

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    loginId: "",      // email or username (for sign-in)
    email: "",        // email (for sign-up)
    username: "",     // username (for sign-up)
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",        // phone (for sign-up, stored in auth metadata)
    school: "",
    className: "",
    certification: "",
    accountType: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const activeRoleLabel =
    formData.accountType === "educator"
      ? copy.educatorRole
      : formData.accountType === "student"
        ? copy.studentRole
        : "";
  const fieldStyle = isRTL ? { direction: "rtl", textAlign: "right" } : undefined;
  const selectBaseStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    background: "#ffffff",
  };
  const errorStyle = {
    color: "#dc2626",
    fontSize: 14,
    margin: "4px 0 0",
    textAlign: isRTL ? "right" : "left",
  };
  const submitErrorStyle = { ...errorStyle, margin: "8px 0 0" };
  const accountTypeErrorStyle = { ...errorStyle, margin: "0 0 12px" };

  const canUseCredentials =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    navigator.credentials &&
    typeof navigator.credentials.get === "function" &&
    typeof navigator.credentials.store === "function";
  const needsRoleSelection = isSignUp && !formData.accountType;

  const toggleAuthMode = () => {
    setErrors({});
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsSignUp((prev) => {
      const next = !prev;
      setFormData((f) => ({
        ...f,
        loginId: next ? "" : f.loginId,
        password: "",
        confirmPassword: "",
        accountType: next ? "" : f.accountType,
        className: next ? "" : f.className,
        certification: next ? "" : f.certification,
      }));
      return next;
    });
  };

  const handleAccountTypeSelect = (value) => {
    setFormData((prev) => ({
      ...prev,
      accountType: value,
      className: value === "student" ? prev.className : "",
      certification: value === "educator" ? prev.certification : "",
    }));
    setErrors((prev) => ({
      ...prev,
      accountType: "",
      ...(value === "student" ? { certification: "" } : { className: "" }),
    }));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleAccountTypeReset = () => {
    setFormData((prev) => ({ ...prev, accountType: "", className: "", certification: "" }));
    setErrors((prev) => ({ ...prev, accountType: "", className: "", certification: "" }));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    let active = true;
    if (!canUseCredentials || isSignUp) return undefined;
    (async () => {
      try {
        const cred = await navigator.credentials.get({
          password: true,
          mediation: "silent",
        });
        if (!active || !cred || cred.type !== "password") return;
        setFormData((prev) => ({
          ...prev,
          loginId: cred.id || "",
          password: cred.password || "",
        }));
        setShowPassword(false);
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.info("Credential autofill skipped", err);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [canUseCredentials, isSignUp]);

  const storeCredential = useCallback(
    async (id, pwd, nameHint) => {
      if (!canUseCredentials || !id || !pwd) return;
      try {
        if (window.PasswordCredential) {
          const cred = new window.PasswordCredential({
            id,
            password: pwd,
            name: nameHint || undefined,
          });
          await navigator.credentials.store(cred);
        } else {
          await navigator.credentials.store({
            id,
            password: pwd,
            name: nameHint || undefined,
            type: "password",
          });
        }
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.info("Credential store skipped", err);
        }
      }
    },
    [canUseCredentials]
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const loginId = formData.loginId.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const firstName = (formData.firstName || "").trim();
    const lastName = (formData.lastName || "").trim();
    const phone = (formData.phone || "").trim();
    const username = formData.username.trim();
    const school = formData.school.trim();
    const className = formData.className.trim();
    const certification = formData.certification.trim();
    const accountType = (formData.accountType || "").toLowerCase();
    const usernamePattern = /^[a-zA-Z0-9_\-\.]{3,30}$/;
    const phoneDigits = phone.replace(/\D/g, "");

    // Sign-in requires email or username
    if (!isSignUp) {
      if (!loginId) newErrors.loginId = copy.loginIdRequired;
      else if (loginId.includes("@")) {
        if (!/\S+@\S+\.\S+/.test(loginId)) newErrors.loginId = copy.emailInvalid;
      } else if (!usernamePattern.test(loginId)) {
        newErrors.loginId = copy.loginIdInvalid;
      }
    }

    // Sign-up requires email, username, password, confirm, first/last name
    if (isSignUp) {
      if (!email) newErrors.email = copy.emailRequired;
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = copy.emailInvalid;
      if (!username) newErrors.username = copy.usernameRequired;
      else if (!usernamePattern.test(username)) newErrors.username = copy.usernameInvalid;
      if (!phone) newErrors.phone = copy.phoneRequired;
      else if (phoneDigits.length < 6) newErrors.phone = copy.phoneInvalid;
      if (!["student", "educator"].includes(accountType)) newErrors.accountType = copy.accountTypeRequired;
      if (!school) newErrors.school = copy.schoolRequired;
      if (accountType === "student") {
        if (!className) newErrors.className = copy.classRequired;
      } else if (accountType === "educator") {
        if (!certification) newErrors.certification = copy.certificationRequired;
      }
    }

    if (!password) newErrors.password = copy.passwordRequired;
    else if (password.length < 6) newErrors.password = copy.passwordTooShort;
    if (isSignUp) {
      if (!firstName) newErrors.firstName = copy.firstNameRequired;
      if (!lastName) newErrors.lastName = copy.lastNameRequired;
      if (!confirmPassword) newErrors.confirmPassword = copy.confirmPasswordRequired;
      else if (password !== confirmPassword) newErrors.confirmPassword = copy.passwordsDontMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsRoleSelection) {
      setErrors((prev) => ({ ...prev, accountType: copy.accountTypeRequired }));
      return;
    }
    const ok = validateForm();
    if (!ok) return;
    setLoading(true);
    const loginId = formData.loginId.trim();
    const email = formData.email.trim();
    const username = formData.username.trim();
    const phone = (formData.phone || "").trim();
    const password = formData.password;
    const firstName = (formData.firstName || "").trim();
    const lastName = (formData.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const accountTypeSelection = (formData.accountType || "").toLowerCase();
    const normalizedAccountType = accountTypeSelection === "educator" ? "educator" : "student";
    const school = formData.school.trim();
    const className = formData.className.trim();
    const certification = formData.certification.trim();
    try {
      let isAdminUser = false;
      if (isSignUp) {
        // Supabase Auth: sign up with email/password
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName || username,
              first_name: firstName || undefined,
              last_name: lastName || undefined,
              username,
              phone,
              school,
              class: normalizedAccountType === "student" ? className : "",
              className: normalizedAccountType === "student" ? className : "",
              certification: normalizedAccountType === "educator" ? certification : "",
              accountType: normalizedAccountType,
              role: normalizedAccountType,
            },
          },
        });
        if (error) throw error;

        const user = data.user;
        const session = data.session;
        // If confirmations are enabled, session may be null
        if (!session || !user) {
          setErrors((prev) => ({ ...prev, submit: copy.confirmEmailNotice }));
          setLoading(false);
          return;
        }
        // Upsert profile with default role
        let role = email.toLowerCase() === "anasitani186@gmail.com" ? "admin" : normalizedAccountType;
        const profileRow = {
          id: user.id,
          email,
          username,
          name: fullName || username,
          role,
          school: school || null,
          class_name: normalizedAccountType === "student" ? (className || null) : null,
          phone: phone || null,
          ai_access: false,
        };
        await supabase.from("profiles").upsert(profileRow);
        const current = {
          id: user.id,
          email,
          username,
          name: profileRow.name,
          role,
          school: profileRow.school || "",
          class_name: profileRow.class_name || "",
          phone: profileRow.phone || "",
          ai_access: false,
        };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = role === "admin";
        await storeCredential(email, password, username || fullName || email);
      } else {
        // Supabase Auth: sign in using email/password (lookup by username if needed)
        let signInEmail = loginId;
        if (!loginId.includes("@")) {
          const { data: usernameRows, error: usernameErr } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", loginId)
            .limit(1);
          if (usernameErr) throw usernameErr;
          const match = Array.isArray(usernameRows) ? usernameRows[0] : null;
          if (!match?.email) throw new Error("Invalid email or password");
          signInEmail = match.email;
        } else {
          signInEmail = loginId;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email: signInEmail, password });
        if (error) throw new Error("Invalid email or password");
        const user = data.user;
        // Get or create profile
        let profile = null;
        const { data: profRows } = await supabase.from("profiles").select("*").eq("id", user.id).limit(1);
        profile = profRows && profRows[0];
        const metaType = (user.user_metadata?.accountType || user.user_metadata?.role || "").toLowerCase();
        const metaRole = metaType === "educator" ? "educator" : metaType === "student" ? "student" : "";
        const isAdminEmail = user.email?.toLowerCase() === "anasitani186@gmail.com";

        if (profile) {
          const currentRole = (profile.role || "").toLowerCase();
          const shouldBackfill = isAdminEmail || !currentRole || currentRole === "user";
          if (shouldBackfill) {
            const desiredRole = isAdminEmail ? "admin" : metaRole || "student";
            if (desiredRole && desiredRole !== profile.role) {
              const { error: roleUpdateError } = await supabase
                .from("profiles")
                .update({ role: desiredRole })
                .eq("id", user.id);
              if (!roleUpdateError) profile = { ...profile, role: desiredRole };
            }
          }
        }

        if (!profile) {
          let inferredRole = metaRole === "educator" ? "educator" : "student";
          if (isAdminEmail) inferredRole = "admin";
          const meta = user.user_metadata || {};
          const uname = meta.username || (user.email ? user.email.split("@")[0] : "");
          const inferredName =
            meta.name ||
            [meta.first_name || meta.firstName, meta.last_name || meta.lastName].filter(Boolean).join(" ").trim();
          const fallbackSchool = meta.school || meta.organization || null;
          const fallbackClass = meta.className || meta.class || null;
          const fallbackPhone = meta.phone || meta.phoneNumber || null;
          const insertRow = {
            id: user.id,
            email: user.email,
            username: uname,
            name: inferredName || uname,
            role: inferredRole,
            ai_access: false,
            school: fallbackSchool,
            class_name: fallbackClass,
            phone: fallbackPhone,
          };
          await supabase.from("profiles").insert(insertRow);
          profile = { ...insertRow };
        }
        const current = {
          id: user.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role,
          ai_access: profile.ai_access ?? false,
          school: profile.school || "",
          class_name: profile.class_name || "",
          phone: profile.phone || "",
        };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (profile.role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = profile.role === "admin";
        await storeCredential(signInEmail, password, profile?.name || profile?.username || signInEmail);
      }
      // Navigate back to home for all users
      onNavigate("home");
    } catch (err) {
      const msg = err?.message || String(err);
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  // no email confirmation flow

  const HeaderActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar title={isSignUp ? copy.signUpTitle : copy.signInTitle} right={HeaderActions} lang={lang} />

      <Card style={{ direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left" }}>
        {needsRoleSelection ? (
          <>
            <div style={{ marginBottom: 24, textAlign: isRTL ? "right" : "center" }}>
              <h2 style={{ margin: 0, color: "#111827" }}>{copy.roleSelectHeading}</h2>
              <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
                {copy.roleSelectBody}
              </p>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleAccountTypeSelect(role.value)}
                  style={{
                    textAlign: isRTL ? "right" : "left",
                    border: "1px solid #d1d5db",
                    borderRadius: 12,
                    padding: "16px 18px",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border 120ms ease, box-shadow 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = "1px solid #6366f1";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = "1px solid #d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid #6366f1";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid #d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: 16 }}>{role.label}</div>
                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>{role.description}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <Btn variant="secondary" onClick={toggleAuthMode} style={{ width: "100%" }}>
                {copy.backToSignIn}
              </Btn>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate autoComplete="on">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "#111827", textAlign: "center" }}>
                {isSignUp ? copy.createAccount : copy.welcomeBack}
              </h2>
              <p style={{ margin: "8px 0 0", color: "#6b7280", textAlign: "center" }}>
                {isSignUp ? copy.signUpSubtitle : copy.signInSubtitle}
              </p>
            </div>

            {isSignUp && formData.accountType && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#374151", fontSize: 14 }}>
                  {copy.signingUpAsLabel}{" "}
                  <strong style={{ color: "#111827" }}>{activeRoleLabel}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAccountTypeReset}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "underline",
                  }}
                >
                  {copy.changeRole}
                </button>
              </div>
            )}
            {errors.accountType && (
              <p style={accountTypeErrorStyle}>{errors.accountType}</p>
            )}

            {isSignUp && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <Field
                      label={copy.firstName}
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder={copy.enterFirstName}
                      invalid={!!errors.firstName}
                      autoComplete="given-name"
                      name="firstName"
                      style={fieldStyle}
                    />
                    {errors.firstName && (
                      <p style={errorStyle}>{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Field
                      label={copy.lastName}
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder={copy.enterLastName}
                      invalid={!!errors.lastName}
                      autoComplete="family-name"
                      name="lastName"
                      style={fieldStyle}
                    />
                    {errors.lastName && (
                      <p style={errorStyle}>{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <Field
                  label={copy.usernameLabel}
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder={copy.usernamePlaceholder}
                  invalid={!!errors.username}
                  autoComplete="username"
                  name="username"
                  style={fieldStyle}
                />
                {errors.username && (
                  <p style={errorStyle}>{errors.username}</p>
                )}
                <Field
                  label={copy.phoneLabel}
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder={copy.phonePlaceholder}
                  invalid={!!errors.phone}
                  autoComplete="tel"
                  name="phone"
                  style={fieldStyle}
                />
                {errors.phone && (
                  <p style={errorStyle}>{errors.phone}</p>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>
                    {copy.schoolLabel}
                  </label>
                  <select
                    value={formData.school}
                    onChange={(e) => handleInputChange("school", e.target.value)}
                    style={{ ...selectBaseStyle, ...(fieldStyle || {}), paddingRight: 30 }}
                  >
                    {SIGNUP_SCHOOL_OPTIONS.map((opt) => (
                      <option key={opt.value || "blank"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.school && (
                  <p style={errorStyle}>{errors.school}</p>
                )}
                {formData.accountType === "student" && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>
                        {copy.classLabel}
                      </label>
                      <select
                        value={formData.className}
                        onChange={(e) => handleInputChange("className", e.target.value)}
                        style={{ ...selectBaseStyle, ...(fieldStyle || {}), paddingRight: 30 }}
                      >
                        {SIGNUP_GRADE_OPTIONS.map((opt) => (
                          <option key={opt.value || "blank"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.className && (
                      <p style={errorStyle}>{errors.className}</p>
                    )}
                  </>
                )}
                {formData.accountType === "educator" && (
                  <>
                    <Field
                      label={copy.certificationLabel}
                      value={formData.certification}
                      onChange={(e) => handleInputChange("certification", e.target.value)}
                      placeholder={copy.certificationPlaceholder}
                      invalid={!!errors.certification}
                      autoComplete="off"
                      name="certification"
                      style={fieldStyle}
                    />
                    {errors.certification && (
                      <p style={errorStyle}>{errors.certification}</p>
                    )}
                  </>
                )}
              </>
            )}

            {!isSignUp ? (
              <>
                <Field
                  label={copy.emailOrUsername}
                  value={formData.loginId}
                  onChange={(e) => handleInputChange("loginId", e.target.value)}
                  placeholder={copy.emailOrUsernamePlaceholder}
                  invalid={!!errors.loginId}
                  type="text"
                  autoComplete="username"
                  name="username"
                  style={fieldStyle}
                />
                {errors.loginId && (
                  <p style={errorStyle}>{errors.loginId}</p>
                )}
              </>
            ) : (
              <>
                <Field
                  label={copy.email}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder={copy.enterEmail}
                  invalid={!!errors.email}
                  type="email"
                  autoComplete="email"
                  name="email"
                  style={fieldStyle}
                />
                {errors.email && (
                  <p style={errorStyle}>{errors.email}</p>
                )}
              </>
            )}

            <Field
              label={copy.password}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder={copy.enterPassword}
              invalid={!!errors.password}
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              name={isSignUp ? "new-password" : "password"}
              style={fieldStyle}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  title={showPassword ? copy.hidePassword : copy.showPassword}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#4b5563",
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
            {errors.password && (
              <p style={errorStyle}>{errors.password}</p>
            )}

            {isSignUp && (
              <>
                <Field
                  label={copy.confirmPassword}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder={copy.confirmYourPassword}
                  invalid={!!errors.confirmPassword}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  name="new-password-confirm"
                  style={fieldStyle}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? copy.hideConfirmPassword : copy.showConfirmPassword}
                      title={showConfirmPassword ? copy.hideConfirmPassword : copy.showConfirmPassword}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        margin: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        color: "#4b5563",
                      }}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                {errors.confirmPassword && (
                  <p style={errorStyle}>
                    {errors.confirmPassword}
                  </p>
                )}
              </>
            )}

            {errors.submit && (
              <p style={submitErrorStyle}>{errors.submit}</p>
            )}

            <div style={{ marginTop: 24 }}>
              <Btn
                variant="primary"
                type="submit"
                style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading
                  ? isSignUp
                    ? copy.signingUp
                    : copy.signingIn
                  : isSignUp
                    ? copy.signUp
                    : copy.signIn}
              </Btn>
            </div>

            <div style={{ marginTop: 16 }}>
              <Btn variant="secondary" onClick={() => onNavigate("home")} style={{ width: "100%" }}>
                {copy.backToHome}
              </Btn>
            </div>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={toggleAuthMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  cursor: "pointer",
                  fontSize: 14,
                  textDecoration: "underline",
                }}
              >
                {isSignUp ? copy.alreadyHaveAccount : copy.dontHaveAccount}
              </button>
            </div>
          </form>
        )}
      </Card>
    </PageWrap>
  );
}
