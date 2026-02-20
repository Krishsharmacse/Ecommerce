export const promoteToAdmin = async (req, res) => {
    try {
        const { email, adminSecret } = req.body;
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ message: "Invalid Secret" });
        }

        const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
        res.status(200).json({ success: true, message: `${user.email} is now admin` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};