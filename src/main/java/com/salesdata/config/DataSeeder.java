package com.salesdata.config;

import com.salesdata.entity.Role;
import com.salesdata.entity.User;
import java.util.List;
import com.salesdata.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("Anmol0001").isEmpty()) {
            User admin1 = new User();
            admin1.setUsername("Anmol0001");
            admin1.setPassword(passwordEncoder.encode("Anmol0001"));
            admin1.setRole(Role.ADMIN);
            userRepository.save(admin1);
        }

        if (userRepository.findByUsername("Salish0001").isEmpty()) {
            User admin2 = new User();
            admin2.setUsername("Salish0001");
            admin2.setPassword(passwordEncoder.encode("Salish0001"));
            admin2.setRole(Role.ADMIN);
            userRepository.save(admin2);
        }

        List<User> devUsers = userRepository.findByIsDeveloper(true);
        if (devUsers.isEmpty()) {
            User devAdmin = new User();
            devAdmin.setUsername("smash89kumar");
            devAdmin.setPassword(passwordEncoder.encode("Deepak_ishu"));
            devAdmin.setRole(Role.ADMIN);
            devAdmin.setDeveloper(true);
            userRepository.save(devAdmin);
        }
    }
}
